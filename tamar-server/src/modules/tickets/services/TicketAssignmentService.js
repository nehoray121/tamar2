const { ROLES } = require('../../../domain/access/constants.js');
const {
    ASSIGNMENT_END_REASONS, ASSIGNMENT_SOURCES, BULK_ASSIGNMENT_OPERATIONS
} = require('../domain/assignmentConstants.js');
const { TICKET_HISTORY_EVENTS, TICKET_STATUSES } = require('../domain/constants.js');
const { ticketError, ticketNotFound } = require('../domain/errors.js');
const { toAssignmentDto, toTicketDto } = require('./ticketDto.js');

const normalizeIds = (ids) => [...new Set(ids.map(String))].sort((left, right) => left.localeCompare(right));
const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const sameSet = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
const pagination = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    return { page, limit, totalItems, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
};

class TicketAssignmentService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async loadTicketAccess(userId, ticketId, { session, requireAssignmentAuthority = false } = {}) {
        const access = await this.authorizationService.resolveAccess(userId, { session });
        const ticket = await this.ticketRepository.findById(ticketId, { session });
        if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
        if (requireAssignmentAuthority && !this.authorizationService.hasAssignmentAuthority(access, ticket)) {
            throw ticketError(403, 'ASSIGNMENT_FORBIDDEN', 'You cannot manage assignments for this ticket');
        }
        return { access, ticket };
    }

    async assertOpenOperational(ticket, session) {
        if (ticket.status !== TICKET_STATUSES.OPEN) {
            throw ticketError(409, 'ASSIGNMENT_TICKET_CLOSED', 'Assignments can change only on an open ticket');
        }
        try {
            const lineage = await this.organization.integrityService.resolveRoom(ticket.currentRoomId, {
                systemId: ticket.systemId,
                environmentId: ticket.environmentId,
                subEnvironmentId: ticket.subEnvironmentId,
                requireOperational: true,
                session
            });
            if (!sameId(lineage.room._id, ticket.currentRoomId)) throw new Error('room mismatch');
        } catch (error) {
            if (error?.code === 'ASSIGNMENT_SCOPE_INACTIVE') throw error;
            throw ticketError(409, 'ASSIGNMENT_SCOPE_INACTIVE', 'The ticket room or its parent scope is inactive');
        }
    }

    async assertEligibleTargets(ticket, assigneeIds, session) {
        if (!assigneeIds.length) return;
        const users = await this.userRepository.findByIds(assigneeIds, { session });
        const usersById = new Map(users.map((user) => [String(user._id), user]));
        for (const id of assigneeIds) {
            const user = usersById.get(id);
            if (!user) throw ticketError(404, 'ASSIGNMENT_TARGET_NOT_FOUND', 'An assignment target was not found');
            if (!user.isActive) throw ticketError(409, 'ASSIGNMENT_TARGET_INACTIVE', 'An assignment target is inactive');
        }
        const memberships = await this.membershipRepository.findActiveAssignableRoomMemberships({
            roomId: ticket.currentRoomId,
            systemId: ticket.systemId,
            environmentId: ticket.environmentId,
            subEnvironmentId: ticket.subEnvironmentId,
            userIds: assigneeIds
        }, { session });
        const memberIds = new Set(memberships.map((membership) => String(membership.userId)));
        for (const id of assigneeIds) {
            if (!memberIds.has(id)) {
                throw ticketError(409, 'ASSIGNMENT_TARGET_NOT_IN_ROOM', 'An assignment target lacks an eligible direct Room membership');
            }
        }
    }

    historyPayload(ticket, beforeIds, afterIds, actorUserId, actorRoleContext, source) {
        const before = normalizeIds(beforeIds);
        const after = normalizeIds(afterIds);
        const beforeSet = new Set(before);
        const afterSet = new Set(after);
        const addedIds = after.filter((id) => !beforeSet.has(id));
        const removedIds = before.filter((id) => !afterSet.has(id));
        return {
            entry: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
                systemId: ticket.systemId,
                environmentId: ticket.environmentId,
                subEnvironmentId: ticket.subEnvironmentId,
                roomId: ticket.currentRoomId,
                eventType: TICKET_HISTORY_EVENTS.ASSIGNEES_UPDATED,
                actorUserId,
                actorRoleContext,
                versionBefore: ticket.version - 1,
                versionAfter: ticket.version,
                changedFields: ['activeAssigneeIds'],
                changes: { activeAssigneeIds: { before, after } },
                metadata: { source, addedAssigneeIds: addedIds, removedAssigneeIds: removedIds, addedCount: addedIds.length, removedCount: removedIds.length }
            },
            addedIds,
            removedIds
        };
    }

    assignmentRecords(ticket, userIds, actorUserId, source, now) {
        return userIds.map((userId) => ({
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            systemId: ticket.systemId,
            environmentId: ticket.environmentId,
            subEnvironmentId: ticket.subEnvironmentId,
            roomId: ticket.currentRoomId,
            userId,
            assignedBy: actorUserId,
            assignedAt: now,
            assignmentSource: source,
            isActive: true,
            endedAt: null,
            endedBy: null,
            endedReason: null,
            metadata: {}
        }));
    }

    async applyChange({ ticket, access, actorUserId, desiredIds, source, removedReason, session }) {
        const beforeIds = normalizeIds(ticket.activeAssigneeIds || []);
        const afterIds = normalizeIds(desiredIds);
        if (sameSet(beforeIds, afterIds)) throw ticketError(409, 'EMPTY_ASSIGNMENT_CHANGE', 'The effective assignment set did not change');
        const beforeSet = new Set(beforeIds);
        const afterSet = new Set(afterIds);
        const addedIds = afterIds.filter((id) => !beforeSet.has(id));
        const removedIds = beforeIds.filter((id) => !afterSet.has(id));
        const now = new Date();

        const ended = await this.assignmentRepository.endActive(ticket._id, removedIds, {
            endedAt: now, endedBy: actorUserId, endedReason: removedReason
        }, { session });
        if (ended.modifiedCount !== removedIds.length) {
            throw ticketError(409, 'ASSIGNMENT_NOT_FOUND', 'The active assignment set is inconsistent');
        }
        await this.assignmentRepository.createMany(
            this.assignmentRecords(ticket, addedIds, actorUserId, source, now),
            { session }
        );
        const updated = await this.ticketRepository.replaceAssigneesOpen(
            ticket._id, ticket.version, afterIds, { session }
        );
        if (!updated) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket changed while assignments were being updated');
        const history = this.historyPayload(updated, beforeIds, afterIds, actorUserId,
            this.authorizationService.actorRoleContext(access, ticket), source);
        await this.historyRepository.append(history.entry, { session });
        return { ticket: updated, access, addedIds: history.addedIds, removedIds: history.removedIds };
    }

    async replace(userId, ticketId, expectedVersion, assigneeIds) {
        const result = await this.transactionRunner.run(async (session) => {
            const { access, ticket } = await this.loadTicketAccess(userId, ticketId, { session, requireAssignmentAuthority: true });
            await this.assertOpenOperational(ticket, session);
            if (ticket.version !== expectedVersion) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket version is stale');
            const desiredIds = normalizeIds(assigneeIds);
            await this.assertEligibleTargets(ticket, desiredIds, session);
            return this.applyChange({
                ticket, access, actorUserId: userId, desiredIds,
                source: ASSIGNMENT_SOURCES.SINGLE,
                removedReason: ASSIGNMENT_END_REASONS.REPLACED_ASSIGNMENT_SET,
                session
            });
        });
        this.publishChanges([result]);
        const summaries = await this.assigneeSummaryService.forTicket(result.ticket);
        return toTicketDto(result.ticket, this.capabilityService.forTicket(result.access, result.ticket), summaries);
    }

    async assignableUsers(userId, ticketId, query) {
        const { access, ticket } = await this.loadTicketAccess(userId, ticketId);
        if (!this.authorizationService.hasAssignmentAuthority(access, ticket)) throw ticketNotFound();
        await this.assertOpenOperational(ticket);
        const currentIds = normalizeIds(ticket.activeAssigneeIds || []);
        const result = await this.membershipRepository.listAssignableUsers({
            ticket,
            search: query.search,
            page: query.page,
            limit: query.limit,
            excludeUserIds: query.includeAssigned ? [] : currentIds
        });
        const assigned = new Set(currentIds);
        return {
            items: result.items.map((item) => ({
                id: String(item._id),
                displayName: item.displayName,
                email: item.email || null,
                eligibleRoomRole: item.eligibleRoomRole,
                isCurrentlyAssigned: assigned.has(String(item._id))
            })),
            pagination: pagination(query.page, query.limit, result.totalItems)
        };
    }

    async assignments(userId, ticketId, query) {
        const { ticket } = await this.loadTicketAccess(userId, ticketId);
        const result = await this.assignmentRepository.list(ticket._id, query);
        const summaries = await this.assigneeSummaryService.mapByIds(result.items.flatMap((item) => [
            item.userId, item.assignedBy, item.endedBy
        ]));
        return {
            items: result.items.map((item) => toAssignmentDto(item, summaries)),
            pagination: pagination(query.page, query.limit, result.totalItems),
            sort: { sortDirection: query.sortDirection },
            view: query.view
        };
    }

    async bulk(userId, input) {
        let results;
        try {
            results = await this.transactionRunner.run(async (session) => {
                const access = await this.authorizationService.resolveAccess(userId, { session });
                const requestedIds = input.tickets.map((item) => item.ticketId);
                const tickets = await this.ticketRepository.findManyByIds(requestedIds, { session });
                const byId = new Map(tickets.map((ticket) => [String(ticket._id), ticket]));
                const ordered = requestedIds.map((id) => byId.get(String(id)));
                if (ordered.some((ticket) => !ticket || !this.authorizationService.canView(access, ticket))) throw ticketNotFound();
                if (ordered.some((ticket) => !this.authorizationService.hasAssignmentAuthority(access, ticket))) {
                    throw ticketError(403, 'ASSIGNMENT_FORBIDDEN', 'You cannot manage one or more requested tickets');
                }
                const roomIds = new Set(ordered.map((ticket) => String(ticket.currentRoomId)));
                if (roomIds.size !== 1) throw ticketError(400, 'BULK_ASSIGNMENT_MIXED_ROOMS', 'Bulk assignments require tickets from one Room');
                for (let index = 0; index < ordered.length; index += 1) {
                    await this.assertOpenOperational(ordered[index], session);
                    if (ordered[index].version !== input.tickets[index].expectedVersion) {
                        throw ticketError(409, 'VERSION_CONFLICT', 'One or more ticket versions are stale');
                    }
                }
                const requestedAssigneeIds = normalizeIds(input.assigneeIds);
                await this.assertEligibleTargets(ordered[0], requestedAssigneeIds, session);
                const outcomes = [];
                let changedCount = 0;
                for (const ticket of ordered) {
                    const currentIds = normalizeIds(ticket.activeAssigneeIds || []);
                    let desiredIds;
                    if (input.operation === BULK_ASSIGNMENT_OPERATIONS.ADD) desiredIds = normalizeIds([...currentIds, ...requestedAssigneeIds]);
                    else if (input.operation === BULK_ASSIGNMENT_OPERATIONS.REMOVE) {
                        const remove = new Set(requestedAssigneeIds);
                        desiredIds = currentIds.filter((id) => !remove.has(id));
                    } else desiredIds = requestedAssigneeIds;
                    if (sameSet(currentIds, desiredIds)) {
                        outcomes.push({ ticket, access, addedIds: [], removedIds: [], changed: false });
                        continue;
                    }
                    const change = await this.applyChange({
                        ticket, access, actorUserId: userId, desiredIds,
                        source: ASSIGNMENT_SOURCES.BULK,
                        removedReason: input.operation === BULK_ASSIGNMENT_OPERATIONS.REMOVE
                            ? ASSIGNMENT_END_REASONS.BULK_REMOVAL
                            : ASSIGNMENT_END_REASONS.REPLACED_ASSIGNMENT_SET,
                        session
                    });
                    outcomes.push({ ...change, changed: true });
                    changedCount += 1;
                }
                if (!changedCount) throw ticketError(409, 'EMPTY_ASSIGNMENT_CHANGE', 'The bulk operation did not change any ticket');
                return outcomes;
            });
        } catch (error) {
            if (error?.code || error?.statusCode) throw error;
            throw ticketError(409, 'BULK_ASSIGNMENT_FAILED', 'The bulk assignment transaction failed');
        }
        this.publishChanges(results.filter((result) => result.changed !== false));
        return {
            operation: input.operation,
            results: results.map((result) => ({
                ticketId: String(result.ticket._id),
                ticketNumber: result.ticket.ticketNumber,
                version: result.ticket.version,
                activeAssigneeCount: result.ticket.activeAssigneeIds.length,
                addedCount: result.addedIds.length,
                removedCount: result.removedIds.length
            }))
        };
    }

    publishChanges(changes) {
        for (const change of changes) {
            try { this.assignmentRealtimePublisher.publish(change); } catch {}
            try { this.ticketRealtimePublisher.publish('ticket:updated', change.ticket); } catch {}
            try { this.ticketRealtimePublisher.publish('ticket:history:created', change.ticket); } catch {}
        }
    }
}

module.exports = TicketAssignmentService;
