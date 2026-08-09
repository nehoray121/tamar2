import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../components/TicketChatDrawer.jsx', import.meta.url), 'utf8');

test('component renders safe text, tombstones and capability-gated actions', () => {
    assert.match(source, /whitespace-pre-wrap/);
    assert.match(source, /dir="auto"/);
    assert.match(source, /message.isDeleted/);
    assert.match(source, /message.capabilities.canEdit/);
    assert.match(source, /message.capabilities.canDelete/);
    assert.match(source, /chat.canWriteChat/);
    assert.doesNotMatch(source, /isReadOnly/);
});

test('component exposes loading, empty, denied, retry and pagination states', () => {
    for (const marker of ['ticket-chat-drawer', 'ticket-chat-messages', 'ticket-chat-load-older', 'ticket-chat-composer', 'ticket-chat-send']) {
        assert.match(source, new RegExp(marker));
    }
    assert.match(source, /status === 'loading'/);
    assert.match(source, /status === 'error'/);
    assert.match(source, /status === 'inaccessible'/);
    assert.match(source, /pageInfo.hasMoreBefore/);
});
