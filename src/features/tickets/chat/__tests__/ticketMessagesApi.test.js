import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicketMessagesApi } from '../api/ticketMessagesApi.js';

test('Message API uses only canonical Ticket routes and approved payloads', async () => {
    const calls = [];
    const api = createTicketMessagesApi(async (path, options = {}) => {
        calls.push({ path, options });
        return { status: 200, data: {}, etag: '"7"' };
    });
    const signal = new AbortController().signal;
    await api.getTicketDetails({ ticketId: 'ticket/1', signal });
    await api.getTicketMessages({ ticketId: 'ticket/1', limit: 25, before: 'cursor value', signal });
    await api.createTicketMessage({ ticketId: 'ticket/1', clientMessageId: 'uuid-1', content: 'plain', signal });
    await api.updateTicketMessage({ ticketId: 'ticket/1', messageId: 'message/1', content: 'edited', ifMatch: '"4"', signal });
    await api.deleteTicketMessage({ ticketId: 'ticket/1', messageId: 'message/1', ifMatch: '"5"', signal });

    assert.deepEqual(calls.map((call) => call.path), [
        '/api/tickets/ticket%2F1',
        '/api/tickets/ticket%2F1/messages?limit=25&before=cursor+value',
        '/api/tickets/ticket%2F1/messages',
        '/api/tickets/ticket%2F1/messages/message%2F1',
        '/api/tickets/ticket%2F1/messages/message%2F1'
    ]);
    assert.deepEqual(calls[2].options.body, { clientMessageId: 'uuid-1', content: 'plain' });
    assert.deepEqual(calls[3].options.body, { content: 'edited' });
    assert.equal(calls[3].options.headers['If-Match'], '"4"');
    assert.equal(calls[4].options.headers['If-Match'], '"5"');
    assert.equal(calls.every((call) => !call.path.includes('transfer')), true);
    assert.equal(calls.every((call) => call.options.signal === signal), true);
});
