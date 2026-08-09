const { EXTERNAL_TRANSFER_STATES, TRANSFER_STATUSES } = require('./transfer.constants.js');

const id = (value) => value ? String(value) : null;

const deriveExternalState = (transfer, ticket) => {
    if (transfer.status === TRANSFER_STATUSES.PENDING_ACCEPTANCE) return EXTERNAL_TRANSFER_STATES.PENDING;
    if (transfer.status === TRANSFER_STATUSES.CANCELLED) return EXTERNAL_TRANSFER_STATES.CANCELLED;
    return ticket?.status === 'CLOSED' ? EXTERNAL_TRANSFER_STATES.DONE : EXTERNAL_TRANSFER_STATES.PROCESSING;
};

const toSafeUser = (value, summaries) => {
    const userId = id(value);
    return userId ? (summaries?.get(userId) || { id: userId, displayName: null, email: null }) : null;
};

const toTransferDto = (transfer, { ticket, capabilities, userSummaries } = {}) => ({
    id: id(transfer._id),
    ticketId: id(transfer.ticketId),
    ticketNumber: transfer.ticketNumber,
    systemId: id(transfer.systemId),
    sourceEnvironmentId: id(transfer.sourceEnvironmentId),
    sourceSubEnvironmentId: id(transfer.sourceSubEnvironmentId),
    sourceRoomId: id(transfer.sourceRoomId),
    destinationEnvironmentId: id(transfer.destinationEnvironmentId),
    destinationSubEnvironmentId: id(transfer.destinationSubEnvironmentId),
    destinationRoomId: id(transfer.destinationRoomId),
    status: transfer.status,
    externalState: ticket ? deriveExternalState(transfer, ticket) : undefined,
    sequence: transfer.sequence,
    reason: transfer.transferReason,
    initiatedBy: toSafeUser(transfer.initiatedBy, userSummaries),
    initiatedAt: transfer.initiatedAt,
    acceptedBy: toSafeUser(transfer.acceptedBy, userSummaries),
    acceptedAt: transfer.acceptedAt || null,
    cancelledBy: toSafeUser(transfer.cancelledBy, userSummaries),
    cancelledAt: transfer.cancelledAt || null,
    cancellationReason: transfer.cancellationReason || null,
    ticketVersionBeforeInitiation: transfer.ticketVersionBeforeInitiation,
    ticketVersionAfterInitiation: transfer.ticketVersionAfterInitiation,
    ticketVersionBeforeResolution: transfer.ticketVersionBeforeResolution ?? null,
    ticketVersionAfterResolution: transfer.ticketVersionAfterResolution ?? null,
    createdAt: transfer.createdAt,
    updatedAt: transfer.updatedAt,
    capabilities
});

const toTicketSummary = (ticket) => ticket ? ({
    id: id(ticket._id),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
    currentRoomId: id(ticket.currentRoomId),
    activeTransferId: id(ticket.activeTransferId),
    version: ticket.version,
    updatedAt: ticket.updatedAt
}) : null;

const toRoomSummary = (room) => room ? ({ id: id(room._id), key: room.key, name: room.name }) : null;

module.exports = { deriveExternalState, toRoomSummary, toTicketSummary, toTransferDto };
