import { BOARD_TYPES, isExternalBoard, requireBoardType } from './boardTypes.js';

const priorityLabels = Object.freeze({
    CRITICAL: 'גבוהה-1',
    HIGH: 'גבוהה-1',
    MEDIUM: 'בינונית-2',
    LOW: 'נמוכה-3'
});

const externalStatusLabels = Object.freeze({
    PENDING: 'pending',
    PROCESSING: 'processing',
    DONE: 'done',
    CANCELLED: 'pending'
});

const formatDate = (value) => {
    if (!value) return 'לא זמין';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'לא זמין';
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export const formatVersionEtag = (version) => `"${Number(version) || 0}"`;

export const adaptCategory = (category, etag = null) => category ? ({
    ...category,
    categoryVersion: Number(category.version) || 0,
    categoryEtag: etag || formatVersionEtag(category.version),
    archived: category.isActive === false
}) : null;

export const adaptBoardState = (state, etag = null) => ({
    category: adaptCategory(state?.category),
    categoryId: state?.category?.id || null,
    isPinned: Boolean(state?.isPinned),
    pinnedAt: state?.pinnedAt || null,
    boardStateVersion: Number(state?.version) || 0,
    boardStateEtag: etag || formatVersionEtag(state?.version),
    canChangeCategory: Boolean(state?.capabilities?.canChangeCategory),
    canChangePin: Boolean(state?.capabilities?.canChangePin)
});

export const adaptBoardItem = (item) => {
    const boardType = requireBoardType(item?.boardType);
    const external = isExternalBoard(boardType);
    const ticketId = String(item?.ticket?.id || '');
    const transferId = external ? String(item?.transfer?.id || '') : null;
    const boardItemId = external ? transferId : ticketId;
    if (!ticketId || !boardItemId || (external && !transferId)) {
        throw new TypeError('Board item is missing its canonical Ticket or Transfer identity');
    }

    const state = adaptBoardState(item.boardState);
    const fieldValues = item.ticket?.fieldValues || {};
    const eventDate = external ? item.transfer?.initiatedAt : (item.ticket?.createdAt || item.ticket?.updatedAt);
    return {
        id: boardItemId,
        boardItemId,
        ticketId,
        transferId,
        rowKey: `${boardType}:${boardItemId}`,
        boardType,
        roomId: String(item.roomId || ''),
        itemType: external ? 'TRANSFER' : 'TICKET',
        ticket: item.ticket,
        ticketVersion: Number(item.ticket?.version) || 0,
        transfer: external ? item.transfer : null,
        transferVersion: external && Number.isFinite(Number(item.transfer?.version)) ? Number(item.transfer.version) : null,
        capabilities: item.ticket?.capabilities || {},
        displayId: item.ticket?.ticketNumber || ticketId,
        priority: priorityLabels[item.ticket?.priority] || 'בינונית-2',
        name: item.ticket?.subject || 'ללא נושא',
        room: external
            ? (boardType === BOARD_TYPES.EXTERNAL_SENT ? item.transfer?.destinationRoomId : item.transfer?.sourceRoomId)
            : item.ticket?.currentRoomId,
        phone: fieldValues.phone || '',
        customerId: fieldValues.customerId || '',
        handler: fieldValues.handler || '',
        treatment: fieldValues.treatment || '',
        network: fieldValues.network || '',
        fieldValues,
        date: formatDate(eventDate),
        createdAt: item.ticket?.createdAt || null,
        updatedAt: item.ticket?.updatedAt || null,
        closedAt: item.ticket?.closedAt || null,
        status: String(item.ticket?.status || '').toLowerCase(),
        description: item.ticket?.description || '',
        externalState: item.transfer?.externalState || null,
        submissionStatus: externalStatusLabels[item.transfer?.externalState] || null,
        isOutgoingExternal: boardType === BOARD_TYPES.EXTERNAL_SENT,
        originalIndex: 0,
        category: state.category,
        categoryId: state.categoryId,
        pinned: state.isPinned,
        isPinned: state.isPinned,
        pinnedAt: state.pinnedAt,
        boardStateVersion: state.boardStateVersion,
        boardStateEtag: state.boardStateEtag,
        canChangeCategory: state.canChangeCategory,
        canChangePin: state.canChangePin
    };
};

export const replaceBoardItemState = (row, state, etag = null) => {
    const next = adaptBoardState(state, etag);
    return {
        ...row,
        category: next.category,
        categoryId: next.categoryId,
        pinned: next.isPinned,
        isPinned: next.isPinned,
        pinnedAt: next.pinnedAt,
        boardStateVersion: next.boardStateVersion,
        boardStateEtag: next.boardStateEtag,
        canChangeCategory: next.canChangeCategory,
        canChangePin: next.canChangePin
    };
};
