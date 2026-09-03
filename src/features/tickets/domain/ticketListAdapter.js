const priorityLabels = Object.freeze({
    CRITICAL: 'גבוהה-1',
    HIGH: 'גבוהה-1',
    MEDIUM: 'בינונית-2',
    LOW: 'נמוכה-3'
});

const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'לא זמין'
        : new Intl.DateTimeFormat('he-IL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
};

export const adaptTicketListItem = (
    ticket,
    view = 'MY_TASKS'
) => {
    const fieldValues = ticket.fieldValues || {};
    return {
        id: String(ticket.id),
        boardItemId: String(ticket.id),
        ticketId: String(ticket.id),
        transferId: null,
        rowKey: `${view}:${ticket.id}`,
        displayId: ticket.ticketNumber || String(ticket.id),
        ticket,
        ticketVersion: Number(ticket.version) || 0,
        capabilities: ticket.capabilities || {},
        priority: priorityLabels[ticket.priority]
            || priorityLabels.MEDIUM,
        name: ticket.subject || 'ללא נושא',
        room: ticket.currentRoomId,
        phone: fieldValues.phone || 'לא זמין',
        customerId: fieldValues.customerId || '',
        handler: fieldValues.handler || '',
        treatment: fieldValues.treatment || '',
        network: fieldValues.network || '',
        fieldValues,
        date: formatDate(ticket.createdAt || ticket.updatedAt),
        createdAt: ticket.createdAt || null,
        updatedAt: ticket.updatedAt || null,
        closedAt: ticket.closedAt || null,
        status: String(ticket.status || '').toLowerCase(),
        description: ticket.description || '',
        category: null,
        categoryId: null,
        pinned: false,
        isPinned: false,
        canChangeCategory: false,
        canChangePin: false,
        originalIndex: 0
    };
};
