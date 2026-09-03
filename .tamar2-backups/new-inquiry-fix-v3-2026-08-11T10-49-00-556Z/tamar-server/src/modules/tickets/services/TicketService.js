const { TICKET_HISTORY_EVENTS, TICKET_MUTABLE_FIELDS, TICKET_STATUSES, TICKET_VIEWS } = require('../domain/constants.js');
const { ticketError, ticketNotFound } = require('../domain/errors.js');
const { toHistoryDto, toTicketDto } = require('./ticketDto.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const escapedRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const truncate = (value) => typeof value === 'string' && value.length > 240 ? `${value.slice(0, 237)}...` : value;
const boundedValue = (value) => {
    if (value === null || ['boolean', 'number'].includes(typeof value)) return value;
    if (typeof value === 'string') return truncate(value);
    const serialized = JSON.stringify(value);
    return serialized.length <= 1000 ? JSON.parse(serialized) : { summary: `${serialized.slice(0, 960)}...`, truncated: true };
};
const changed = (before, after) => JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
const pagination = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    return { page, limit, totalItems, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
};

class TicketService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async operationalRoomLineage(roomId, session) {
        try {
            const lineage = await this.organization.integrityService.resolveRoom(roomId, { requireOperational: true, session });
            return {
                systemId: lineage.system._id,
                environmentId: lineage.environment._id,
                subEnvironmentId: lineage.subEnvironment._id,
                roomId: lineage.room._id,
                systemKey: lineage.system.key
            };
        } catch (error) {
            if (['ORGANIZATION_SCOPE_INACTIVE', 'ROOM_NOT_FOUND', 'SUB_ENVIRONMENT_NOT_FOUND', 'ENVIRONMENT_NOT_FOUND', 'SYSTEM_NOT_FOUND'].includes(error?.code)) {
                throw ticketError(400, 'TICKET_SCOPE_INACTIVE', 'The selected room or its parent scope is inactive');
            }
            throw error;
        }
    }

    ticketPrefix(systemKey) {
        const canonical = String(systemKey ?? '').normalize('NFKC').trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(canonical)) {
            throw ticketError(500, 'TICKET_NUMBER_ALLOCATION_FAILED', 'System key cannot be used for ticket numbering');
        }
        return canonical;
    }

    reservationDto(reservation) {
        return {
            id: String(reservation._id),
            ticketNumber: reservation.ticketNumber,
            sequenceNumber: reservation.sequenceNumber,
            roomId: String(reservation.roomId),
            expiresAt: reservation.expiresAt
        };
    }

    async reserveNumber(userId, roomId) {
        const access = await this.authorizationService.resolveAccess(userId);
        const lineage = await this.operationalRoomLineage(roomId);
        if (!this.authorizationService.canCreate(access, lineage)) {
            throw ticketError(403, 'TICKET_CREATE_FORBIDDEN', 'You cannot create a ticket in this room');
        }

        const reusable = await this.reservationRepository.findReusable(userId, lineage.roomId);
        if (reusable && sameId(reusable.systemId, lineage.systemId)) {
            return this.reservationDto(reusable);
        }

        const reservation = await this.transactionRunner.run(async (session) => {
            const existing = await this.reservationRepository.findReusable(
                userId,
                lineage.roomId,
                { session }
            );
            if (existing && sameId(existing.systemId, lineage.systemId)) return existing;

            const sequenceNumber = await this.sequenceRepository.allocate(
                lineage.systemId,
                { session }
            );
            const ticketNumber = `${this.ticketPrefix(lineage.systemKey)}-${String(sequenceNumber).padStart(8, '0')}`;

            return this.reservationRepository.create({
                userId,
                systemId: lineage.systemId,
                roomId: lineage.roomId,
                sequenceNumber,
                ticketNumber,
                expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)),
                consumedAt: null
            }, { session });
        });

        return this.reservationDto(reservation);
    }

    historyPayload(ticket, eventType, actorUserId, actorRoleContext, versionBefore, changedFields, changes = {}, metadata = {}) {
        return {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            systemId: ticket.systemId,
            environmentId: ticket.environmentId,
            subEnvironmentId: ticket.subEnvironmentId,
            roomId: ticket.currentRoomId,
            eventType,
            actorUserId,
            actorRoleContext,
            versionBefore,
            versionAfter: ticket.version,
            changedFields,
            changes,
            metadata
        };
    }

    async create(userId, payload) {
        const created = await this.transactionRunner.run(async (session) => {
            const access = await this.authorizationService.resolveAccess(userId, { session });
            const lineage = await this.operationalRoomLineage(payload.roomId, session);
            if (!this.authorizationService.canCreate(access, lineage)) {
                throw ticketError(403, 'TICKET_CREATE_FORBIDDEN', 'You cannot create a ticket in this room');
            }
            let sequenceNumber;
            let ticketNumber;

            if (payload.reservationId) {
                const reservation = await this.reservationRepository.consume(
                    payload.reservationId,
                    userId,
                    lineage.roomId,
                    { session }
                );
                if (!reservation || !sameId(reservation.systemId, lineage.systemId)) {
                    throw ticketError(
                        409,
                        'TICKET_NUMBER_RESERVATION_INVALID',
                        'The reserved ticket number is invalid or expired'
                    );
                }
                sequenceNumber = reservation.sequenceNumber;
                ticketNumber = reservation.ticketNumber;
            } else {
                sequenceNumber = await this.sequenceRepository.allocate(
                    lineage.systemId,
                    { session }
                );
                const prefix = this.ticketPrefix(lineage.systemKey);
                ticketNumber = `${prefix}-${String(sequenceNumber).padStart(8, '0')}`;
            }
            const ticket = await this.ticketRepository.create({
                systemId: lineage.systemId,
                environmentId: lineage.environmentId,
                subEnvironmentId: lineage.subEnvironmentId,
                originalRoomId: lineage.roomId,
                currentRoomId: lineage.roomId,
                visibleRoomIds: [lineage.roomId],
                sequenceNumber,
                ticketNumber,
                subject: payload.subject,
                description: payload.description,
                priority: payload.priority,
                fieldValues: payload.fieldValues || {},
                status: TICKET_STATUSES.OPEN,
                createdBy: userId,
                activeAssigneeIds: [],
                activeTransferId: null,
                version: 1
            }, { session });
            const actorRole = this.authorizationService.actorRoleContext(access, ticket);
            await this.historyRepository.append(this.historyPayload(
                ticket, TICKET_HISTORY_EVENTS.CREATED, userId, actorRole, 0,
                ['subject', 'description', 'priority', 'fieldValues', 'status'], {}, { source: 'TICKET_API' }
            ), { session });
            return { ticket: ticket.toObject(), access };
        });
        this.realtimePublisher.publish('ticket:created', created.ticket);
        this.realtimePublisher.publish('ticket:history:created', created.ticket);
        return toTicketDto(created.ticket, this.capabilityService.forTicket(created.access, created.ticket));
    }

    buildListFilter(access, userId, query) {
        const historicalVisibility = query.view !== TICKET_VIEWS.OPEN;
        const conditions = [this.authorizationService.buildAccessFilter(access, { historical: historicalVisibility })];
        conditions.push({ status: query.view === TICKET_VIEWS.HISTORY ? TICKET_STATUSES.CLOSED : TICKET_STATUSES.OPEN });
        if (query.view === TICKET_VIEWS.OPEN) conditions.push({ activeTransferId: null });
        if (query.view === TICKET_VIEWS.MY_TASKS) {
            conditions.push({ $or: [{ createdBy: userId }, { activeAssigneeIds: userId }] });
        }
        for (const field of ['systemId', 'environmentId', 'subEnvironmentId']) if (query[field]) conditions.push({ [field]: query[field] });
        if (query.roomId) conditions.push({ currentRoomId: query.roomId });
        if (query.priority) conditions.push({ priority: query.priority });
        if (query.createdBy) conditions.push({ createdBy: query.createdBy });
        if (query.customerId) conditions.push({ 'fieldValues.customerId': query.customerId });
        const ranges = [['createdAt', 'createdFrom', 'createdTo'], ['updatedAt', 'updatedFrom', 'updatedTo'], ['closedAt', 'closedFrom', 'closedTo']];
        for (const [field, from, to] of ranges) {
            if (query[from] || query[to]) conditions.push({ [field]: {
                ...(query[from] ? { $gte: query[from] } : {}), ...(query[to] ? { $lte: query[to] } : {})
            } });
        }
        if (query.search) {
            const regex = new RegExp(escapedRegex(query.search), 'iu');
            conditions.push({ $or: [{ ticketNumber: regex }, { subject: regex }, { description: regex }] });
        }
        return { $and: conditions };
    }

    async list(userId, query) {
        const access = await this.authorizationService.resolveAccess(userId);
        const filter = this.buildListFilter(access, userId, query);
        const sort = { [query.sortBy]: query.sortDirection === 'asc' ? 1 : -1, _id: query.sortDirection === 'asc' ? 1 : -1 };
        const result = await this.ticketRepository.list(filter, { page: query.page, limit: query.limit, sort });
        const activeTransfers = await this.transferRepository.findManyByIds(
            result.items.map((ticket) => ticket.activeTransferId).filter(Boolean)
        );
        const transfersById = new Map(activeTransfers.map((transfer) => [String(transfer._id), transfer]));
        const summaries = await this.assigneeSummaryService.forTickets(result.items);
        return {
            items: result.items.map((ticket) => {
                const activeTransfer = ticket.activeTransferId ? transfersById.get(String(ticket.activeTransferId)) : null;
                return toTicketDto(
                    ticket,
                    this.capabilityService.forTicket(access, ticket, activeTransfer),
                    summaries.get(String(ticket._id)) || []
                );
            }),
            pagination: pagination(query.page, query.limit, result.totalItems),
            appliedFilters: { ...query, search: query.search || undefined },
            sort: { sortBy: query.sortBy, sortDirection: query.sortDirection }
        };
    }

    async get(userId, ticketId) {
        const [access, ticket] = await Promise.all([
            this.authorizationService.resolveAccess(userId), this.ticketRepository.findById(ticketId)
        ]);
        if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
        const [summaries, activeTransfer] = await Promise.all([
            this.assigneeSummaryService.forTicket(ticket),
            ticket.activeTransferId ? this.transferRepository.findById(ticket.activeTransferId) : null
        ]);
        return toTicketDto(ticket, this.capabilityService.forTicket(access, ticket, activeTransfer), summaries);
    }

    async update(userId, ticketId, expectedVersion, updates) {
        const result = await this.transactionRunner.run(async (session) => {
            const access = await this.authorizationService.resolveAccess(userId, { session });
            const ticket = await this.ticketRepository.findById(ticketId, { session });
            if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
            if (ticket.status !== TICKET_STATUSES.OPEN) throw ticketError(409, 'TICKET_NOT_OPEN', 'Only an open ticket can be edited');
            if (!this.authorizationService.canEdit(access, ticket)) throw ticketError(403, 'TICKET_EDIT_FORBIDDEN', 'You cannot edit this ticket');
            if (ticket.version !== expectedVersion) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket version is stale');
            const changedFields = TICKET_MUTABLE_FIELDS.filter((field) => updates[field] !== undefined && changed(ticket[field], updates[field]));
            if (!changedFields.length) throw ticketError(400, 'EMPTY_UPDATE', 'At least one ticket field must change');
            const actualUpdates = Object.fromEntries(changedFields.map((field) => [field, updates[field]]));
            const updated = await this.ticketRepository.updateOpen(ticketId, expectedVersion, actualUpdates, { session });
            if (!updated) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket changed while it was being edited');
            const changes = Object.fromEntries(changedFields.map((field) => [field, {
                before: boundedValue(ticket[field]), after: boundedValue(updated[field])
            }]));
            await this.historyRepository.append(this.historyPayload(
                updated, TICKET_HISTORY_EVENTS.UPDATED, userId,
                this.authorizationService.actorRoleContext(access, ticket), expectedVersion, changedFields, changes
            ), { session });
            return { ticket: updated, access };
        });
        this.realtimePublisher.publish('ticket:updated', result.ticket);
        this.realtimePublisher.publish('ticket:history:created', result.ticket);
        const summaries = await this.assigneeSummaryService.forTicket(result.ticket);
        return toTicketDto(result.ticket, this.capabilityService.forTicket(result.access, result.ticket), summaries);
    }

    async close(userId, ticketId, expectedVersion, closureSummary) {
        const result = await this.transactionRunner.run(async (session) => {
            const access = await this.authorizationService.resolveAccess(userId, { session });
            const ticket = await this.ticketRepository.findById(ticketId, { session });
            if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
            if (ticket.status === TICKET_STATUSES.CLOSED) throw ticketError(409, 'TICKET_ALREADY_CLOSED', 'Ticket is already closed');
            if (!this.authorizationService.canClose(access, ticket)) throw ticketError(403, 'TICKET_CLOSE_FORBIDDEN', 'You cannot close this ticket');
            if (ticket.version !== expectedVersion) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket version is stale');
            const closed = await this.ticketRepository.close(ticketId, expectedVersion, {
                status: TICKET_STATUSES.CLOSED, closedBy: userId, closedAt: new Date(), closureSummary
            }, { session });
            if (!closed) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket changed while it was being closed');
            await this.historyRepository.append(this.historyPayload(
                closed, TICKET_HISTORY_EVENTS.CLOSED, userId,
                this.authorizationService.actorRoleContext(access, ticket), expectedVersion,
                ['status', 'closedBy', 'closedAt', 'closureSummary'],
                { status: { before: TICKET_STATUSES.OPEN, after: TICKET_STATUSES.CLOSED } }
            ), { session });
            return { ticket: closed, access };
        });
        this.realtimePublisher.publish('ticket:closed', result.ticket);
        this.realtimePublisher.publish('ticket:history:created', result.ticket);
        const summaries = await this.assigneeSummaryService.forTicket(result.ticket);
        return toTicketDto(result.ticket, this.capabilityService.forTicket(result.access, result.ticket), summaries);
    }

    async history(userId, ticketId, query) {
        const [access, ticket] = await Promise.all([
            this.authorizationService.resolveAccess(userId), this.ticketRepository.findById(ticketId)
        ]);
        if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
        const [result, activeTransfer] = await Promise.all([
            this.historyRepository.list(ticketId, query),
            ticket.activeTransferId ? this.transferRepository.findById(ticket.activeTransferId) : null
        ]);
        return {
            items: result.items.map(toHistoryDto),
            pagination: pagination(query.page, query.limit, result.totalItems),
            sort: { sortDirection: query.sortDirection },
            capabilities: this.capabilityService.forTicket(access, ticket, activeTransfer)
        };
    }
}

module.exports = TicketService;
