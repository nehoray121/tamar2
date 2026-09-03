const { ASSIGNMENT_END_REASONS } = require('../../domain/assignmentConstants.js');
const { TICKET_HISTORY_EVENTS, TICKET_STATUSES } = require('../../domain/constants.js');
const { ticketError, ticketNotFound } = require('../../domain/errors.js');
const { toTicketDto } = require('../../services/ticketDto.js');
const { TRANSFER_STATUSES } = require('../domain/transfer.constants.js');
const { toTransferDto } = require('../domain/transfer.dto.js');
const { transferError, transferNotFound } = require('../domain/transfer.errors.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const uniqueIds = (values) => [...new Map(values.filter(Boolean).map((value) => [String(value), value])).values()];
const bounded = (value) => value.length > 240 ? `${value.slice(0, 237)}...` : value;

class TicketTransferService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async operationalLineage(roomId, { systemId, session, target = false } = {}) {
        try {
            return await this.organization.integrityService.resolveRoom(roomId, {
                systemId, requireOperational: true, session
            });
        } catch (error) {
            if (target) {
                if (error?.code === 'ROOM_NOT_FOUND') throw transferError(404, 'TRANSFER_TARGET_NOT_FOUND', 'Transfer target was not found');
                if (error?.code === 'INCONSISTENT_ORGANIZATION_LINEAGE') {
                    throw transferError(409, 'TRANSFER_CROSS_SYSTEM_FORBIDDEN', 'Transfers across Systems are forbidden');
                }
                if (['ORGANIZATION_SCOPE_INACTIVE', 'SUB_ENVIRONMENT_NOT_FOUND', 'ENVIRONMENT_NOT_FOUND', 'SYSTEM_NOT_FOUND'].includes(error?.code)) {
                    throw transferError(409, 'TRANSFER_DESTINATION_INACTIVE', 'Transfer destination or its parent scope is inactive');
                }
            } else if (['ORGANIZATION_SCOPE_INACTIVE', 'ROOM_NOT_FOUND', 'SUB_ENVIRONMENT_NOT_FOUND', 'ENVIRONMENT_NOT_FOUND', 'SYSTEM_NOT_FOUND'].includes(error?.code)) {
                throw transferError(409, 'TRANSFER_SOURCE_INACTIVE', 'Transfer source or its parent scope is inactive');
            }
            throw error;
        }
    }

    historyPayload(ticket, eventType, actorUserId, actorRoleContext, versionBefore, changedFields, changes, metadata) {
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

    async mutationDto(result, activeTransfer = null) {
        const [assignees, users] = await Promise.all([
            this.assigneeSummaryService.forTicket(result.ticket),
            this.assigneeSummaryService.mapByIds([
                result.transfer.initiatedBy, result.transfer.acceptedBy, result.transfer.cancelledBy
            ])
        ]);
        return {
            transfer: toTransferDto(result.transfer, {
                ticket: result.ticket,
                capabilities: this.capabilityService.forTicket(result.access, result.ticket, activeTransfer),
                userSummaries: users
            }),
            ticket: toTicketDto(
                result.ticket,
                this.capabilityService.forTicket(result.access, result.ticket, activeTransfer),
                assignees
            )
        };
    }

    async initiate(userId, ticketId, expectedVersion, input) {
        const result = await this.transactionRunner.run(async (session) => {
            const access = await this.authorizationService.resolveAccess(userId, { session });
            const ticket = await this.ticketRepository.findById(ticketId, { session });
            if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
            if (ticket.status !== TICKET_STATUSES.OPEN) throw transferError(409, 'TRANSFER_TICKET_CLOSED', 'Closed Tickets cannot be transferred');
            if (ticket.activeTransferId) throw transferError(409, 'TRANSFER_ALREADY_PENDING', 'A pending Transfer already exists');
            if (ticket.version !== expectedVersion) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket version is stale');
            if (!this.authorizationService.canTransfer(access, ticket)) {
                throw transferError(403, 'TRANSFER_INITIATION_FORBIDDEN', 'You cannot transfer this Ticket');
            }
            const source = await this.operationalLineage(ticket.currentRoomId, { systemId: ticket.systemId, session });
            if (sameId(input.destinationRoomId, ticket.currentRoomId)) {
                throw transferError(409, 'TRANSFER_TARGET_SAME_AS_SOURCE', 'Transfer destination must differ from source');
            }
            const destination = await this.operationalLineage(input.destinationRoomId, {
                systemId: ticket.systemId, session, target: true
            });
            if (!sameId(destination.system._id, ticket.systemId)) {
                throw transferError(409, 'TRANSFER_CROSS_SYSTEM_FORBIDDEN', 'Transfers across Systems are forbidden');
            }
            const sequence = await this.transferRepository.nextSequence(ticket._id, { session });
            const now = new Date();
            const transfer = await this.transferRepository.create({
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
                systemId: ticket.systemId,
                sourceEnvironmentId: source.environment._id,
                sourceSubEnvironmentId: source.subEnvironment._id,
                sourceRoomId: source.room._id,
                destinationEnvironmentId: destination.environment._id,
                destinationSubEnvironmentId: destination.subEnvironment._id,
                destinationRoomId: destination.room._id,
                status: TRANSFER_STATUSES.PENDING_ACCEPTANCE,
                initiatedBy: userId,
                initiatedAt: now,
                transferReason: input.reason,
                acceptedBy: null,
                acceptedAt: null,
                cancelledBy: null,
                cancelledAt: null,
                cancellationReason: null,
                ticketVersionBeforeInitiation: ticket.version,
                ticketVersionAfterInitiation: ticket.version + 1,
                ticketVersionBeforeResolution: null,
                ticketVersionAfterResolution: null,
                sequence,
                metadata: {}
            }, { session });
            const activeAssignments = await this.assignmentRepository.findActiveByTicketId(ticket._id, { session });
            const endedAssigneeIds = activeAssignments.map((assignment) => assignment.userId);
            if (endedAssigneeIds.length) {
                const ended = await this.assignmentRepository.endActive(ticket._id, endedAssigneeIds, {
                    isActive: false,
                    endedAt: now,
                    endedBy: userId,
                    endedReason: ASSIGNMENT_END_REASONS.TICKET_TRANSFERRED
                }, { session });
                if (ended.modifiedCount !== endedAssigneeIds.length) {
                    throw transferError(409, 'TRANSFER_ASSIGNMENT_TERMINATION_FAILED', 'Unable to end every active assignment');
                }
            }
            const visibleRoomIds = uniqueIds([
                ...(ticket.visibleRoomIds || []), ticket.currentRoomId, destination.room._id
            ]);
            const updated = await this.ticketRepository.beginTransfer(ticket._id, expectedVersion, {
                environmentId: destination.environment._id,
                subEnvironmentId: destination.subEnvironment._id,
                currentRoomId: destination.room._id,
                visibleRoomIds,
                activeTransferId: transfer._id,
                activeAssigneeIds: []
            }, { session });
            if (!updated) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket changed while Transfer was initiated');
            const actorRole = this.authorizationService.actorRoleContext(access, ticket);
            await this.historyRepository.append(this.historyPayload(
                updated,
                TICKET_HISTORY_EVENTS.TRANSFER_INITIATED,
                userId,
                actorRole,
                ticket.version,
                ['environmentId', 'subEnvironmentId', 'currentRoomId', 'visibleRoomIds', 'activeTransferId', 'activeAssigneeIds'],
                {
                    currentRoomId: { before: String(ticket.currentRoomId), after: String(updated.currentRoomId) },
                    activeTransferId: { before: null, after: String(transfer._id) }
                },
                {
                    transferId: String(transfer._id),
                    sourceRoomId: String(source.room._id),
                    destinationRoomId: String(destination.room._id),
                    transferReason: bounded(input.reason),
                    endedAssigneeIds: endedAssigneeIds.map(String),
                    endedAssigneeCount: endedAssigneeIds.length,
                    previousActiveTransferId: null,
                    newActiveTransferId: String(transfer._id)
                }
            ), { session });
            if (endedAssigneeIds.length) {
                await this.historyRepository.append(this.historyPayload(
                    updated,
                    TICKET_HISTORY_EVENTS.ASSIGNEES_UPDATED,
                    userId,
                    actorRole,
                    ticket.version,
                    ['activeAssigneeIds'],
                    { activeAssigneeIds: { before: endedAssigneeIds.map(String), after: [] } },
                    {
                        source: 'TRANSFER',
                        addedAssigneeIds: [],
                        removedAssigneeIds: endedAssigneeIds.map(String),
                        addedCount: 0,
                        removedCount: endedAssigneeIds.length,
                        endedReason: ASSIGNMENT_END_REASONS.TICKET_TRANSFERRED
                    }
                ), { session });
            }
            return { ticket: updated, transfer: transfer.toObject(), access, endedAssigneeCount: endedAssigneeIds.length };
        });
        this.realtimePublisher.publish('transfer:initiated', result.transfer, result.ticket, {
            endedAssigneeCount: result.endedAssigneeCount
        });
        return this.mutationDto(result, result.transfer);
    }

    async accept(userId, transferId, expectedVersion) {
        const result = await this.transactionRunner.run(async (session) => {
            const access = await this.authorizationService.resolveAccess(userId, { session });
            const transfer = await this.transferRepository.findById(transferId, { session });
            if (!transfer || !this.transferAuthorizationService.canViewDestination(access, transfer)) throw transferNotFound();
            if (transfer.status !== TRANSFER_STATUSES.PENDING_ACCEPTANCE) {
                throw transferError(409, 'TRANSFER_NOT_PENDING', 'Transfer is no longer pending');
            }
            const ticket = await this.ticketRepository.findById(transfer.ticketId, { session });
            if (!ticket || ticket.status !== TICKET_STATUSES.OPEN) throw transferError(409, 'TRANSFER_TICKET_NOT_OPEN', 'Transfer Ticket is not open');
            if (!sameId(ticket.activeTransferId, transfer._id) || !sameId(ticket.currentRoomId, transfer.destinationRoomId)) {
                throw transferError(409, 'TRANSFER_STATE_CONFLICT', 'Ticket and Transfer state are inconsistent');
            }
            if (ticket.version !== expectedVersion) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket version is stale');
            await this.operationalLineage(transfer.destinationRoomId, { systemId: transfer.systemId, session, target: true });
            const capabilities = this.capabilityService.forTicket(access, ticket, transfer);
            if (!capabilities.canAcceptTransfer) throw transferError(403, 'TRANSFER_ACCEPT_FORBIDDEN', 'You cannot accept this Transfer');
            const updatedTicket = await this.ticketRepository.resolveTransfer(
                ticket._id, expectedVersion, transfer._id, transfer.destinationRoomId,
                { activeTransferId: null, activeAssigneeIds: [] }, { session }
            );
            if (!updatedTicket) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket changed while Transfer was accepted');
            const now = new Date();
            const updatedTransfer = await this.transferRepository.acceptPending(transfer._id, {
                acceptedBy: userId,
                acceptedAt: now,
                ticketVersionBeforeResolution: ticket.version,
                ticketVersionAfterResolution: updatedTicket.version
            }, { session });
            if (!updatedTransfer) throw transferError(409, 'TRANSFER_NOT_PENDING', 'Transfer is no longer pending');
            await this.historyRepository.append(this.historyPayload(
                updatedTicket,
                TICKET_HISTORY_EVENTS.TRANSFER_ACCEPTED,
                userId,
                this.authorizationService.actorRoleContext(access, ticket),
                ticket.version,
                ['activeTransferId'],
                { activeTransferId: { before: String(transfer._id), after: null } },
                {
                    transferId: String(transfer._id),
                    sourceRoomId: String(transfer.sourceRoomId),
                    destinationRoomId: String(transfer.destinationRoomId),
                    acceptedBy: String(userId),
                    acceptedAt: now
                }
            ), { session });
            return { ticket: updatedTicket, transfer: updatedTransfer, access };
        });
        this.realtimePublisher.publish('transfer:accepted', result.transfer, result.ticket);
        return this.mutationDto(result);
    }

    async cancel(userId, transferId, expectedVersion, reason) {
    const result = await this.transactionRunner.run(async (session) => {
        const access = await this.authorizationService.resolveAccess(userId, { session });
        const transfer = await this.transferRepository.findById(transferId, { session });
        if (!transfer || !this.transferAuthorizationService.canView(access, transfer)) throw transferNotFound();

            if (transfer.status !== TRANSFER_STATUSES.PENDING_ACCEPTANCE) {
                throw transferError(409, 'TRANSFER_NOT_PENDING', 'Transfer is no longer pending');
            }
            const ticket = await this.ticketRepository.findById(transfer.ticketId, { session });
            if (!ticket || ticket.status !== TICKET_STATUSES.OPEN) throw transferError(409, 'TRANSFER_TICKET_NOT_OPEN', 'Transfer Ticket is not open');
            if (!sameId(ticket.activeTransferId, transfer._id) || !sameId(ticket.currentRoomId, transfer.destinationRoomId)) {
                throw transferError(409, 'TRANSFER_STATE_CONFLICT', 'Ticket and Transfer state are inconsistent');
            }
            if (ticket.version !== expectedVersion) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket version is stale');
            const capabilities = this.capabilityService.forTicket(access, ticket, transfer);
            if (!capabilities.canCancelTransfer) throw transferError(403, 'TRANSFER_CANCEL_FORBIDDEN', 'You cannot cancel this Transfer');
            const source = await this.operationalLineage(transfer.sourceRoomId, { systemId: transfer.systemId, session });
            const updatedTicket = await this.ticketRepository.resolveTransfer(
                ticket._id, expectedVersion, transfer._id, transfer.destinationRoomId,
                {
                    environmentId: source.environment._id,
                    subEnvironmentId: source.subEnvironment._id,
                    currentRoomId: source.room._id,
                    activeTransferId: null,
                    activeAssigneeIds: []
                }, { session }
            );
            if (!updatedTicket) throw ticketError(409, 'VERSION_CONFLICT', 'Ticket changed while Transfer was cancelled');
            const now = new Date();
            const updatedTransfer = await this.transferRepository.cancelPending(transfer._id, {
                cancelledBy: userId,
                cancelledAt: now,
                cancellationReason: reason,
                ticketVersionBeforeResolution: ticket.version,
                ticketVersionAfterResolution: updatedTicket.version
            }, { session });
            if (!updatedTransfer) throw transferError(409, 'TRANSFER_NOT_PENDING', 'Transfer is no longer pending');
            await this.historyRepository.append(this.historyPayload(
                updatedTicket,
                TICKET_HISTORY_EVENTS.TRANSFER_CANCELLED,
                userId,
                this.authorizationService.actorRoleContext(access, ticket),
                ticket.version,
                ['environmentId', 'subEnvironmentId', 'currentRoomId', 'activeTransferId'],
                {
                    currentRoomId: { before: String(ticket.currentRoomId), after: String(updatedTicket.currentRoomId) },
                    activeTransferId: { before: String(transfer._id), after: null }
                },
                {
                    transferId: String(transfer._id),
                    sourceRoomId: String(transfer.sourceRoomId),
                    destinationRoomId: String(transfer.destinationRoomId),
                    cancellationReason: bounded(reason),
                    cancelledBy: String(userId),
                    cancelledAt: now,
                    restoredRoomId: String(source.room._id)
                }
            ), { session });
            return { ticket: updatedTicket, transfer: updatedTransfer, access };
        });
        this.realtimePublisher.publish('transfer:cancelled', result.transfer, result.ticket);
        return this.mutationDto(result);
    }
}

module.exports = TicketTransferService;
