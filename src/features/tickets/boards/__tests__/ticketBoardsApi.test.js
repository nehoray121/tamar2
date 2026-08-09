import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticatedHttpClient } from '../api/authenticatedHttpClient.js';
import { createTicketBoardsApi } from '../api/ticketBoardsApi.js';

const jsonResponse = ({ status = 200, data, error, etag = null } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'etag' ? etag : null },
    text: async () => JSON.stringify(error ? { success: false, error } : { success: true, data })
});

test('authenticated client sends Bearer token, AbortSignal and captures ETag', async () => {
    const calls = [];
    const signal = new AbortController().signal;
    const request = createAuthenticatedHttpClient({
        baseUrl: 'https://tamar.invalid',
        tokenProvider: async () => 'access-token',
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            return jsonResponse({ data: { version: 7 }, etag: '"7"' });
        }
    });
    const response = await request('/api/example', { signal });
    assert.equal(calls[0].url, 'https://tamar.invalid/api/example');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer access-token');
    assert.equal(calls[0].options.signal, signal);
    assert.equal(response.etag, '"7"');
});

test('authenticated client fails closed when no real Access Token is available', async () => {
    let called = false;
    const request = createAuthenticatedHttpClient({
        tokenProvider: async () => '',
        fetchImpl: async () => { called = true; return jsonResponse({ data: {} }); }
    });
    await assert.rejects(() => request('/api/example'), { code: 'AUTH_TOKEN_UNAVAILABLE' });
    assert.equal(called, false);
});

test('normalizes server failures without exposing backend error text', async () => {
    const request = createAuthenticatedHttpClient({
        tokenProvider: async () => 'token',
        fetchImpl: async () => jsonResponse({
            status: 409,
            error: { code: 'BOARD_STATE_VERSION_CONFLICT', message: 'sensitive internal detail', requestId: 'req-1' }
        })
    });
    await assert.rejects(
        () => request('/api/example'),
        (error) => error.code === 'BOARD_STATE_VERSION_CONFLICT'
            && error.requestId === 'req-1'
            && !error.message.includes('sensitive')
    );
});

test('uses the exact seven Phase 8 routes and Transfer identity for external state', async () => {
    const calls = [];
    const api = createTicketBoardsApi(async (path, options = {}) => {
        calls.push({ path, options });
        return { data: {} };
    });
    const common = { roomId: 'room-1', boardType: 'EXTERNAL_SENT' };
    await api.getBoardItems({ ...common, query: { page: 1 } });
    await api.getBoardCategories(common);
    await api.createBoardCategory({ ...common, input: { name: 'צוות' } });
    await api.updateBoardCategory({ ...common, categoryId: 'category-1', input: { name: 'חדש' }, ifMatch: '"2"' });
    await api.archiveBoardCategory({ ...common, categoryId: 'category-1', ifMatch: '"3"' });
    await api.getBoardItemState({ ...common, itemId: 'transfer-7' });
    await api.updateBoardItemState({ ...common, itemId: 'transfer-7', input: { isPinned: true }, ifMatch: '"0"' });

    assert.deepEqual(calls.map((call) => call.path), [
        '/api/rooms/room-1/boards/EXTERNAL_SENT/items?page=1',
        '/api/rooms/room-1/boards/EXTERNAL_SENT/categories',
        '/api/rooms/room-1/boards/EXTERNAL_SENT/categories',
        '/api/rooms/room-1/boards/EXTERNAL_SENT/categories/category-1',
        '/api/rooms/room-1/boards/EXTERNAL_SENT/categories/category-1/archive',
        '/api/rooms/room-1/boards/EXTERNAL_SENT/items/transfer-7/state',
        '/api/rooms/room-1/boards/EXTERNAL_SENT/items/transfer-7/state'
    ]);
    assert.equal(calls[3].options.headers['If-Match'], '"2"');
    assert.equal(calls[4].options.headers['If-Match'], '"3"');
    assert.equal(calls[6].options.headers['If-Match'], '"0"');
});
