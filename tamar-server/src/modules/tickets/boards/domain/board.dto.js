const id = (value) => value ? String(value) : null;

const toCategorySummary = (category) => category ? ({
    id: id(category._id),
    name: category.name,
    color: category.color || null,
    isActive: Boolean(category.isActive),
    version: category.version
}) : null;

const toCategoryDto = (category) => ({
    ...toCategorySummary(category),
    roomId: id(category.roomId),
    boardType: category.boardType,
    description: category.description || null,
    archivedAt: category.archivedAt || null,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
});

const toStateDto = (state, { category = null, capabilities } = {}) => ({
    category: toCategorySummary(category),
    isPinned: Boolean(state?.isPinned),
    pinnedAt: state?.pinnedAt || null,
    version: state?.version || 0,
    capabilities: {
        canChangeCategory: Boolean(capabilities?.canChangeCategory),
        canChangePin: Boolean(capabilities?.canChangePin)
    }
});

const toTicketBoardItem = (ticket, boardType, roomId, state, category, capabilities) => ({
    itemType: 'TICKET',
    boardType,
    roomId: id(roomId),
    ticket: {
        id: id(ticket._id),
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        currentRoomId: id(ticket.currentRoomId),
        version: ticket.version,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        closedAt: ticket.closedAt || null
    },
    transfer: null,
    boardState: toStateDto(state, { category, capabilities })
});

const toTransferBoardItem = (transfer, ticket, boardType, roomId, state, category, capabilities, externalState) => ({
    itemType: 'TRANSFER',
    boardType,
    roomId: id(roomId),
    ticket: {
        id: id(ticket._id), ticketNumber: ticket.ticketNumber, subject: ticket.subject, status: ticket.status
    },
    transfer: {
        id: id(transfer._id),
        sequence: transfer.sequence,
        status: transfer.status,
        externalState,
        sourceRoomId: id(transfer.sourceRoomId),
        destinationRoomId: id(transfer.destinationRoomId),
        initiatedAt: transfer.initiatedAt,
        acceptedAt: transfer.acceptedAt || null,
        cancelledAt: transfer.cancelledAt || null
    },
    boardState: toStateDto(state, { category, capabilities })
});

module.exports = { toCategoryDto, toCategorySummary, toStateDto, toTicketBoardItem, toTransferBoardItem };
