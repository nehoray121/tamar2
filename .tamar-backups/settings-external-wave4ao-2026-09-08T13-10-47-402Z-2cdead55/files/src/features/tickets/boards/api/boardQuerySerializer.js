import { BOARD_TYPES, isExternalBoard, requireBoardType } from '../domain/boardTypes.js';

const commonFields = ['page', 'limit', 'search', 'categoryId', 'categoryMode', 'pinMode', 'sortBy', 'sortDirection'];
const ticketFields = ['priority', 'createdBy', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'closedFrom', 'closedTo'];
const externalFields = ['transferStatus', 'externalState', 'initiatedFrom', 'initiatedTo', 'resolvedFrom', 'resolvedTo'];

const isPresent = (value) => value !== undefined && value !== null && value !== '';

export const serializeBoardQuery = (boardType, input = {}) => {
    requireBoardType(boardType);
    const allowed = new Set([...commonFields, ...(isExternalBoard(boardType) ? externalFields : ticketFields)]);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) {
        if (!allowed.has(key) || !isPresent(value)) continue;
        if (boardType === BOARD_TYPES.OPEN && ['closedFrom', 'closedTo'].includes(key)) continue;
        params.set(key, String(value));
    }
    return params.toString();
};

export const serializeCategoryQuery = (input = {}) => {
    const allowed = new Set(['page', 'limit', 'search', 'includeArchived', 'sortBy', 'sortDirection']);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) {
        if (allowed.has(key) && isPresent(value)) params.set(key, String(value));
    }
    return params.toString();
};
