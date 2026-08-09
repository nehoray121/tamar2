import test from 'node:test';
import assert from 'node:assert/strict';
import {
    adaptTicketMessage,
    createClientMessageId,
    isCanonicalUuidV4,
    isNearConversationBottom,
    mergeTicketMessages,
    pagesToRefresh,
    validateMessageContent
} from '../domain/ticketMessageModel.js';

const message = (overrides = {}) => adaptTicketMessage({
    id: 'm-1',
    ticketId: 't-1',
    author: { id: 'u-1', displayName: 'Actor' },
    content: 'hello',
    version: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
    capabilities: { canEdit: true, canDelete: true },
    ...overrides
});

test('adapter removes deleted content and author controls from tombstones', () => {
    const result = message({ content: '<script>secret</script>', isDeleted: true, version: 4 });
    assert.equal(result.content, null);
    assert.equal(result.isDeleted, true);
    assert.deepEqual(result.capabilities, { canEdit: false, canDelete: false });
    assert.equal(result.messageEtag, '"4"');
});

test('merge is chronological, version-aware and deduplicates by Message ID', () => {
    const old = message();
    const later = message({ id: 'm-2', content: 'later', createdAt: '2026-01-01T11:00:00.000Z' });
    const edited = message({ content: 'server truth', version: 2 });
    const stale = message({ content: 'stale', version: 1 });
    const merged = mergeTicketMessages([old, later], [edited, stale]);
    assert.deepEqual(merged.map((item) => item.id), ['m-1', 'm-2']);
    assert.equal(merged[0].content, 'server truth');
    assert.equal(merged[0].messageVersion, 2);
});

test('draft validation normalizes line endings and enforces text and byte limits', () => {
    assert.equal(validateMessageContent('  first\r\nsecond  ').content, 'first\nsecond');
    assert.equal(validateMessageContent('   ').valid, false);
    assert.equal(validateMessageContent('a'.repeat(10001)).valid, false);
    assert.equal(validateMessageContent('😀'.repeat(10001)).valid, false);
});

test('client Message IDs are unique canonical UUID v4 values', () => {
    const ids = new Set(Array.from({ length: 24 }, createClientMessageId));
    assert.equal(ids.size, 24);
    ids.forEach((id) => assert.equal(isCanonicalUuidV4(id), true));
});

test('realtime refresh pages are bounded and bottom detection is stable', () => {
    assert.equal(pagesToRefresh(0), 1);
    assert.equal(pagesToRefresh(51), 2);
    assert.equal(pagesToRefresh(10000), 4);
    assert.equal(isNearConversationBottom({ scrollHeight: 1000, scrollTop: 820, clientHeight: 120 }), true);
    assert.equal(isNearConversationBottom({ scrollHeight: 1000, scrollTop: 100, clientHeight: 120 }), false);
});
