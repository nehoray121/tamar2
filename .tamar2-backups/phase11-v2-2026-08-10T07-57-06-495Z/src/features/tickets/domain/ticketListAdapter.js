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
        : new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export const adaptTicketListItem = (ticket, view = 'MY_TASKS') => ({
    id: String(ticket.id),
    boardItemId: String(ticket.id),
    ticketId: String(ticket.id),
    transferId: null,
    rowKey: `${view}:${ticket.id}`,
    displayId: ticket.ticketNumber || String(ticket.id),
    ticket,
    ticketVersion: Number(ticket.version) || 0,
    priority: priorityLabels[ticket.priority] || priorityLabels.MEDIUM,
    name: ticket.subject || 'ללא נושא',
    room: ticket.currentRoomId,
    phone: 'לא זמין',
    date: formatDate(ticket.createdAt || ticket.updatedAt),
    status: String(ticket.status || '').toLowerCase(),
    description: ticket.description || '',
    category: null,
    categoryId: null,
    pinned: false,
    isPinned: false,
    canChangeCategory: false,
    canChangePin: false,
    originalIndex: 0
});
