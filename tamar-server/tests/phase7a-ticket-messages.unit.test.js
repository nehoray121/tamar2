const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const TicketMessage = require('../src/modules/tickets/messages/models/TicketMessage.js');
const TicketMessageCapabilityService = require('../src/modules/tickets/messages/services/TicketMessageCapabilityService.js');
const TicketMessageRealtimePublisher = require('../src/modules/tickets/messages/services/TicketMessageRealtimePublisher.js');
const { decodeMessageCursor, encodeMessageCursor } = require('../src/modules/tickets/messages/domain/message.cursor.js');
const { toMessageDto } = require('../src/modules/tickets/messages/domain/message.dto.js');
const {
    normalizeClientMessageId, normalizeMessageContent
} = require('../src/modules/tickets/messages/domain/message.validators.js');

const ids = () => ({
    ticketId: new mongoose.Types.ObjectId(),
    systemId: new mongoose.Types.ObjectId(),
    authorUserId: new mongoose.Types.ObjectId(),
    _id: new mongoose.Types.ObjectId()
});

test('TicketMessage schema is strict, version-key free and defines every Phase 7A index', () => {
    assert.equal(TicketMessage.schema.options.strict, 'throw');
    assert.equal(TicketMessage.schema.options.versionKey, false);
    const indexes = new Map(TicketMessage.schema.indexes().map(([keys, options]) => [options.name, { keys, options }]));
    for (const name of [
        'uniq_ticket_author_client_message', 'ticket_message_chronological_stream',
        'ticket_message_author_activity', 'ticket_message_deletion_stream'
    ]) assert.ok(indexes.has(name), name);
    assert.equal(indexes.get('uniq_ticket_author_client_message').options.unique, true);
});

test('plain-text normalization preserves internal lines and supports Hebrew and emoji', () => {
    assert.equal(normalizeMessageContent('  שלום\r\nעולם 😀  '), 'שלום\nעולם 😀');
});

test('plain-text validation rejects empty, objects, controls and oversized values', () => {
    for (const value of ['', '   ', {}, `valid\u0000invalid`, 'x'.repeat(10_001)]) {
        assert.throws(() => normalizeMessageContent(value), (error) => error.code === 'INVALID_MESSAGE_CONTENT');
    }
});

test('clientMessageId accepts canonical UUID v4 only', () => {
    const canonical = '123e4567-e89b-42d3-a456-426614174000';
    assert.equal(normalizeClientMessageId(canonical), canonical);
    for (const value of [canonical.toUpperCase(), '123e4567-e89b-12d3-a456-426614174000', 'not-a-uuid']) {
        assert.throws(() => normalizeClientMessageId(value), (error) => error.code === 'INVALID_CLIENT_MESSAGE_ID');
    }
});

test('opaque cursor round-trips timestamp and ObjectId and rejects tampering', () => {
    const message = { _id: new mongoose.Types.ObjectId(), createdAt: new Date('2026-07-21T08:00:00.000Z') };
    const cursor = encodeMessageCursor(message);
    assert.doesNotMatch(cursor, /2026|ObjectId/);
    const decoded = decodeMessageCursor(cursor);
    assert.equal(decoded.createdAt.toISOString(), message.createdAt.toISOString());
    assert.equal(String(decoded.id), String(message._id));
    for (const invalid of ['', '***', Buffer.from('{"v":2}', 'utf8').toString('base64url')]) {
        assert.throws(() => decodeMessageCursor(invalid), (error) => error.code === 'VALIDATION_ERROR');
    }
});

test('message capabilities belong only to the author of a live message with current chat access', () => {
    const service = new TicketMessageCapabilityService();
    const author = new mongoose.Types.ObjectId();
    assert.deepEqual(service.forMessage(author, { authorUserId: author, isDeleted: false }, true), {
        canEdit: true, canDelete: true
    });
    assert.deepEqual(service.forMessage(new mongoose.Types.ObjectId(), { authorUserId: author, isDeleted: false }, true), {
        canEdit: false, canDelete: false
    });
    assert.deepEqual(service.forMessage(author, { authorUserId: author, isDeleted: true }, true), {
        canEdit: false, canDelete: false
    });
    assert.deepEqual(service.forMessage(author, { authorUserId: author, isDeleted: false }, false), {
        canEdit: false, canDelete: false
    });
});

test('deleted DTO is a tombstone and never exposes prior content', () => {
    const message = {
        ...ids(), content: 'must remain secret', isEdited: true, editedAt: new Date(),
        isDeleted: true, deletedAt: new Date(), version: 3, createdAt: new Date(), updatedAt: new Date()
    };
    const dto = toMessageDto(message, { capabilities: { canEdit: false, canDelete: false } });
    assert.equal(dto.content, null);
    assert.equal(dto.isDeleted, true);
    assert.doesNotMatch(JSON.stringify(dto), /must remain secret|authorUserId|clientMessageId/);
});

test('realtime event is routing-safe, content-free and reaches the active visible hierarchy union', async () => {
    const emitted = [];
    const io = { to: (rooms) => ({ emit: (event, payload) => emitted.push({ rooms, event, payload }) }) };
    const roomA = new mongoose.Types.ObjectId();
    const roomB = new mongoose.Types.ObjectId();
    const subEnvironment = new mongoose.Types.ObjectId();
    const organization = { integrityService: { resolveRoom: async (roomId) => ({
        room: { _id: roomId }, subEnvironment: { _id: subEnvironment }
    }) } };
    const publisher = new TicketMessageRealtimePublisher({ organization, logger: { warn() {} } });
    publisher.setIo(io);
    const message = {
        ...ids(), content: 'secret body', version: 2, isDeleted: false,
        createdAt: new Date(), updatedAt: new Date(), email: 'secret@example.test'
    };
    await publisher.publish('chat:message-updated', message, {
        currentRoomId: roomB, visibleRoomIds: [roomA, roomB], systemId: message.systemId,
        description: 'secret ticket'
    });
    assert.equal(emitted.length, 1);
    assert.deepEqual(new Set(emitted[0].rooms), new Set([
        `system:${message.systemId}`, `subEnvironment:${subEnvironment}`,
        `room:${roomA}`, `room:${roomB}`
    ]));
    assert.doesNotMatch(JSON.stringify(emitted), /secret body|secret@example|secret ticket|content|email|description/);
});

test('realtime transport and lineage failures are contained after persistence', async () => {
    const warnings = [];
    const publisher = new TicketMessageRealtimePublisher({
        organization: { integrityService: { resolveRoom: async () => { throw new Error('archived'); } } },
        logger: { warn: (...args) => warnings.push(args) }
    });
    publisher.setIo({ to: () => ({ emit: () => { throw new Error('transport'); } }) });
    await publisher.publish('chat:message-created', {
        ...ids(), version: 1, isDeleted: false, createdAt: new Date(), updatedAt: new Date()
    }, { currentRoomId: new mongoose.Types.ObjectId(), visibleRoomIds: [], systemId: new mongoose.Types.ObjectId() });
    assert.equal(warnings.length, 1);
});
