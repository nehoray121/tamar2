import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptBoardItem, replaceBoardItemState } from '../domain/boardItemAdapter.js';

const state = {
    category: { id: 'category-1', name: 'בדיקות', color: '#2563EB', isActive: true, version: 3 },
    isPinned: true,
    pinnedAt: '2026-07-22T07:00:00.000Z',
    version: 4,
    capabilities: { canChangeCategory: true, canChangePin: false }
};

test('OPEN and CLOSED rows use Ticket identity', () => {
    const item = adaptBoardItem({
        boardType: 'OPEN',
        roomId: 'room-1',
        ticket: { id: 'ticket-1', ticketNumber: 'T-1', subject: 'תקלה', priority: 'HIGH', status: 'OPEN' },
        boardState: state
    });
    assert.equal(item.boardItemId, 'ticket-1');
    assert.equal(item.ticketId, 'ticket-1');
    assert.equal(item.transferId, null);
    assert.equal(item.rowKey, 'OPEN:ticket-1');
    assert.equal(item.boardStateEtag, '"4"');
});

test('external rows always use Transfer identity while preserving Ticket identity', () => {
    const item = adaptBoardItem({
        boardType: 'EXTERNAL_SENT',
        roomId: 'room-1',
        ticket: { id: 'ticket-1', ticketNumber: 'T-1', subject: 'העברה', status: 'OPEN' },
        transfer: {
            id: 'transfer-9', externalState: 'PROCESSING', sourceRoomId: 'room-1', destinationRoomId: 'room-2'
        },
        boardState: state
    });
    assert.equal(item.id, 'transfer-9');
    assert.equal(item.boardItemId, 'transfer-9');
    assert.equal(item.transferId, 'transfer-9');
    assert.equal(item.ticketId, 'ticket-1');
    assert.equal(item.rowKey, 'EXTERNAL_SENT:transfer-9');
    assert.equal(item.submissionStatus, 'processing');
});

test('state replacement keeps immutable item identities', () => {
    const row = { boardItemId: 'transfer-9', ticketId: 'ticket-1', transferId: 'transfer-9' };
    const next = replaceBoardItemState(row, { ...state, isPinned: false, version: 5 }, '"5"');
    assert.equal(next.boardItemId, 'transfer-9');
    assert.equal(next.ticketId, 'ticket-1');
    assert.equal(next.isPinned, false);
    assert.equal(next.boardStateEtag, '"5"');
});
