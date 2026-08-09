import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');

test('Ticket Details mounts the real chat with canonical Ticket identity', async () => {
    const source = await read('../../../../pages/TicketListPage/TicketModal.jsx');
    assert.equal(source.includes('TicketChatDrawer'), true);
    assert.equal(source.includes('ticketId={canonicalTicketId}'), true);
    assert.equal(source.includes('ticket.ticketId'), true);
    assert.equal(source.includes('const ChatDrawer'), false);
    assert.equal(source.includes('paperclip'), false);
});

test('chat has one API client, no local persistence, no unsafe HTML and no Socket writes', async () => {
    const files = await Promise.all([
        read('../api/ticketMessagesApi.js'),
        read('../domain/ticketMessageModel.js'),
        read('../hooks/useTicketMessages.js'),
        read('../components/TicketChatDrawer.jsx')
    ]);
    const source = files.join('\n');
    for (const forbidden of ['dangerouslySetInnerHTML', 'localStorage', 'sessionStorage', 'socket.emit', ".emit('chat:", 'attachment', 'upload', 'download', 'paperclip']) {
        assert.equal(source.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
    }
    for (const required of ['message.capabilities.canEdit', 'message.capabilities.canDelete', 'ticketDetails?.capabilities?.canWriteChat', 'clientMessageId', 'If-Match']) {
        assert.equal(source.includes(required), true, required);
    }
});

test('chat realtime extends the existing authenticated Socket singleton', async () => {
    const socketSource = await read('../../boards/realtime/boardSocket.js');
    assert.equal(socketSource.split('io(').length - 1, 1);
    for (const required of ['subscribeTicketChatRealtime', 'chat:message-created', 'chat:message-updated', 'chat:message-deleted']) {
        assert.equal(socketSource.includes(required), true, required);
    }
    assert.equal(socketSource.includes('socket.emit'), false);
});
