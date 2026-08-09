import { authenticatedHttpClient } from './authenticatedHttpClient.js';
import { serializeBoardQuery, serializeCategoryQuery } from './boardQuerySerializer.js';
import { requireBoardType } from '../domain/boardTypes.js';

const encode = (value) => encodeURIComponent(String(value));
const boardPath = (roomId, boardType) => `/api/rooms/${encode(roomId)}/boards/${encode(requireBoardType(boardType))}`;
const withQuery = (path, query) => query ? `${path}?${query}` : path;

export const createTicketBoardsApi = (request = authenticatedHttpClient) => ({
    getBoardItems({ roomId, boardType, query, signal }) {
        return request(withQuery(`${boardPath(roomId, boardType)}/items`, serializeBoardQuery(boardType, query)), { signal });
    },
    getBoardCategories({ roomId, boardType, query, signal }) {
        return request(withQuery(`${boardPath(roomId, boardType)}/categories`, serializeCategoryQuery(query)), { signal });
    },
    createBoardCategory({ roomId, boardType, input, signal }) {
        return request(`${boardPath(roomId, boardType)}/categories`, { method: 'POST', body: input, signal });
    },
    updateBoardCategory({ roomId, boardType, categoryId, input, ifMatch, signal }) {
        return request(`${boardPath(roomId, boardType)}/categories/${encode(categoryId)}`, {
            method: 'PATCH', body: input, signal, headers: { 'If-Match': ifMatch }
        });
    },
    archiveBoardCategory({ roomId, boardType, categoryId, ifMatch, signal }) {
        return request(`${boardPath(roomId, boardType)}/categories/${encode(categoryId)}/archive`, {
            method: 'POST', body: {}, signal, headers: { 'If-Match': ifMatch }
        });
    },
    getBoardItemState({ roomId, boardType, itemId, signal }) {
        return request(`${boardPath(roomId, boardType)}/items/${encode(itemId)}/state`, { signal });
    },
    updateBoardItemState({ roomId, boardType, itemId, input, ifMatch, signal }) {
        return request(`${boardPath(roomId, boardType)}/items/${encode(itemId)}/state`, {
            method: 'PATCH', body: input, signal, headers: { 'If-Match': ifMatch }
        });
    }
});

export const ticketBoardsApi = createTicketBoardsApi();
