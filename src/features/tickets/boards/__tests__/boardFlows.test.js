import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicketBoardsApi } from '../api/ticketBoardsApi.js';

test('virtual OPEN state advances category and pin versions without Ticket version', async () => {
    let boardStateVersion = 0;
    const mutations = [];
    const api = createTicketBoardsApi(async (path, options = {}) => {
        assert.equal(path, '/api/rooms/room-a/boards/OPEN/items/ticket-1/state');
        assert.equal(options.headers['If-Match'], `"${boardStateVersion}"`);
        assert.equal(Object.hasOwn(options.body, 'version'), false);
        mutations.push(options.body);
        boardStateVersion += 1;
        return {
            etag: `"${boardStateVersion}"`,
            data: {
                category: options.body.categoryId ? { id: options.body.categoryId } : null,
                isPinned: Boolean(options.body.isPinned),
                version: boardStateVersion,
                capabilities: { canChangeCategory: true, canChangePin: true }
            }
        };
    });

    const assigned = await api.updateBoardItemState({
        roomId: 'room-a', boardType: 'OPEN', itemId: 'ticket-1', input: { categoryId: 'category-1' }, ifMatch: '"0"'
    });
    const pinned = await api.updateBoardItemState({
        roomId: 'room-a', boardType: 'OPEN', itemId: 'ticket-1', input: { isPinned: true }, ifMatch: assigned.etag
    });

    assert.deepEqual(mutations, [{ categoryId: 'category-1' }, { isPinned: true }]);
    assert.equal(assigned.data.version, 1);
    assert.equal(pinned.data.version, 2);
    assert.equal(pinned.etag, '"2"');
});

test('the same Transfer remains independent across sent and received Room boards', async () => {
    const paths = [];
    const api = createTicketBoardsApi(async (path) => {
        paths.push(path);
        return { data: { version: 1 }, etag: '"1"' };
    });
    await api.updateBoardItemState({
        roomId: 'room-a', boardType: 'EXTERNAL_SENT', itemId: 'transfer-1', input: { categoryId: 'sent-category' }, ifMatch: '"0"'
    });
    await api.updateBoardItemState({
        roomId: 'room-b', boardType: 'EXTERNAL_RECEIVED', itemId: 'transfer-1', input: { isPinned: true }, ifMatch: '"0"'
    });
    assert.deepEqual(paths, [
        '/api/rooms/room-a/boards/EXTERNAL_SENT/items/transfer-1/state',
        '/api/rooms/room-b/boards/EXTERNAL_RECEIVED/items/transfer-1/state'
    ]);
});

test('two transfers for one Ticket never collapse to the Ticket ID in mutation paths', async () => {
    const paths = [];
    const api = createTicketBoardsApi(async (path) => { paths.push(path); return { data: {} }; });
    for (const transferId of ['transfer-ab', 'transfer-bc']) {
        await api.updateBoardItemState({
            roomId: 'room-b', boardType: 'EXTERNAL_SENT', itemId: transferId, input: { isPinned: true }, ifMatch: '"0"'
        });
    }
    assert.equal(paths.some((path) => path.includes('/items/ticket-1/state')), false);
    assert.equal(new Set(paths).size, 2);
});
