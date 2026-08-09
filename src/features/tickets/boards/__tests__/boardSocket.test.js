import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldInvalidateBoardEvent, shouldInvalidateChatEvent, shouldInvalidateWorkflowEvent, shouldRefreshAfterSocketConnect } from '../realtime/boardSocket.js';

test('Board realtime invalidation is isolated by Room and board type', () => {
    const event = { roomId: 'room-a', boardType: 'OPEN' };
    assert.equal(shouldInvalidateBoardEvent(event, 'room-a', 'OPEN'), true);
    assert.equal(shouldInvalidateBoardEvent(event, 'room-b', 'OPEN'), false);
    assert.equal(shouldInvalidateBoardEvent(event, 'room-a', 'CLOSED'), false);
});

test('workflow invalidation respects both affected Room and eligible board', () => {
    const event = { sourceRoomId: 'room-a', destinationRoomId: 'room-b' };
    assert.equal(shouldInvalidateWorkflowEvent('transfer:initiated', event, 'room-a', 'EXTERNAL_SENT'), true);
    assert.equal(shouldInvalidateWorkflowEvent('transfer:initiated', event, 'room-b', 'EXTERNAL_RECEIVED'), true);
    assert.equal(shouldInvalidateWorkflowEvent('transfer:initiated', event, 'room-a', 'CLOSED'), false);
    assert.equal(shouldInvalidateWorkflowEvent('transfer:initiated', event, 'room-c', 'OPEN'), false);
    assert.equal(shouldInvalidateWorkflowEvent('ticket:created', { currentRoomId: 'room-a' }, 'room-a', 'OPEN'), true);
    assert.equal(shouldInvalidateWorkflowEvent('ticket:created', { currentRoomId: 'room-a' }, 'room-a', 'CLOSED'), false);
});

test('initial Socket connection does not duplicate the REST load but reconnect does refresh', () => {
    assert.equal(shouldRefreshAfterSocketConnect(false), false);
    assert.equal(shouldRefreshAfterSocketConnect(true), true);
});


test('Chat invalidation is isolated by canonical Ticket ID', () => {
    const event = { ticketId: 'ticket-1', messageId: 'message-1' };
    assert.equal(shouldInvalidateChatEvent(event, 'ticket-1'), true);
    assert.equal(shouldInvalidateChatEvent(event, 'ticket-2'), false);
    assert.equal(shouldInvalidateChatEvent({ transferId: 'ticket-1' }, 'ticket-1'), false);
});
