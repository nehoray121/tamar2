const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const mongoose = require('mongoose');
const TicketMessage = require('../src/modules/tickets/messages/models/TicketMessage.js');
const TicketMessageRepository = require('../src/modules/tickets/messages/repositories/TicketMessageRepository.js');
const TicketMessageQueryService = require('../src/modules/tickets/messages/services/TicketMessageQueryService.js');
const TicketCapabilityService = require('../src/modules/tickets/services/TicketCapabilityService.js');
const TicketAuthorizationService = require('../src/modules/tickets/services/TicketAuthorizationService.js');
const { ROLES } = require('../src/domain/access/constants.js');
const {
    normalizeMessageContent, parseMessageListQuery
} = require('../src/modules/tickets/messages/domain/message.validators.js');
const { MESSAGE_LIMITS } = require('../src/modules/tickets/messages/domain/message.constants.js');
const { toMessageDto } = require('../src/modules/tickets/messages/domain/message.dto.js');

const projectRoot = path.resolve(__dirname, '..');
const invoke = (middleware, request) => new Promise((resolve) => {
    middleware(request, {}, (error) => resolve(error));
});

test('TicketMessage schema marks canonical identity fields required and immutable', () => {
    for (const field of [
        'ticketId', 'ticketNumber', 'systemId', 'authorUserId', 'clientMessageId'
    ]) {
        const options = TicketMessage.schema.path(field).options;
        assert.equal(options.required, true, `${field} required`);
        assert.equal(options.immutable, true, `${field} immutable`);
    }
    assert.equal(TicketMessage.schema.path('version').options.default, 1);
    assert.equal(TicketMessage.schema.path('isEdited').options.default, false);
    assert.equal(TicketMessage.schema.path('isDeleted').options.default, false);
});

test('TicketMessage indexes preserve unique idempotency and chronological cursor order', () => {
    const indexes = new Map(TicketMessage.schema.indexes().map(([keys, options]) => [
        options.name, { keys, options }
    ]));
    assert.deepEqual(indexes.get('uniq_ticket_author_client_message').keys, {
        ticketId: 1, authorUserId: 1, clientMessageId: 1
    });
    assert.equal(indexes.get('uniq_ticket_author_client_message').options.unique, true);
    assert.deepEqual(indexes.get('ticket_message_chronological_stream').keys, {
        ticketId: 1, createdAt: 1, _id: 1
    });
});

test('Message content accepts Hebrew, English, emoji, line breaks, and exact limits', () => {
    assert.equal(normalizeMessageContent('  Hello\r\nשלום 😀  '), 'Hello\nשלום 😀');
    assert.equal(normalizeMessageContent('x'.repeat(MESSAGE_LIMITS.CONTENT_CHARACTERS)).length,
        MESSAGE_LIMITS.CONTENT_CHARACTERS);
    const byteBoundary = '😀'.repeat(MESSAGE_LIMITS.CONTENT_CHARACTERS);
    assert.equal(Buffer.byteLength(normalizeMessageContent(byteBoundary), 'utf8'),
        MESSAGE_LIMITS.CONTENT_BYTES);
});

test('Message content rejects empty, whitespace, null bytes, controls, arrays, objects, and overflow', () => {
    for (const value of [
        '', ' \r\n ', '\u0000', 'valid\u0007invalid', [], {}, null,
        'x'.repeat(MESSAGE_LIMITS.CONTENT_CHARACTERS + 1),
        '😀'.repeat(MESSAGE_LIMITS.CONTENT_CHARACTERS + 1)
    ]) {
        assert.throws(
            () => normalizeMessageContent(value),
            (error) => error.code === 'INVALID_MESSAGE_CONTENT'
        );
    }
});

test('Message list parser validates limit boundaries and opaque cursor input', async () => {
    for (const limit of ['0', '101', '-1', '1.5', 'many']) {
        const request = { query: { limit } };
        const error = await invoke(parseMessageListQuery, request);
        assert.equal(error.code, 'VALIDATION_ERROR', limit);
    }
    const defaultRequest = { query: {} };
    assert.equal(await invoke(parseMessageListQuery, defaultRequest), undefined);
    assert.equal(defaultRequest.messageQuery.limit, MESSAGE_LIMITS.DEFAULT_PAGE_SIZE);
});

test('Message repository exposes no physical-delete or restore operation', () => {
    const methods = Object.getOwnPropertyNames(TicketMessageRepository.prototype);
    assert.equal(methods.some((name) => /hard|remove|restore|deleteOne|deleteMany/i.test(name)), false);
    const source = fs.readFileSync(path.join(
        projectRoot,
        'src/modules/tickets/messages/repositories/TicketMessageRepository.js'
    ), 'utf8');
    assert.doesNotMatch(source, /deleteOne|deleteMany|findOneAndDelete|findByIdAndDelete/);
});

test('Message DTO allowlist excludes protected identity, membership, idempotency, and Mongoose fields', () => {
    const objectId = new mongoose.Types.ObjectId();
    const dto = toMessageDto({
        _id: objectId,
        ticketId: new mongoose.Types.ObjectId(),
        authorUserId: objectId,
        clientMessageId: '123e4567-e89b-42d3-a456-426614174000',
        content: 'safe',
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 99,
        memberships: [{ role: 'SUPER_ADMIN' }],
        externalIdentity: { subject: 'secret' },
        personalNumberLookupHash: 'secret'
    });
    const serialized = JSON.stringify(dto);
    for (const forbidden of [
        'clientMessageId', 'authorUserId', '__v', 'memberships', 'externalIdentity',
        'personalNumber', 'AccessRequest', 'secret', 'SUPER_ADMIN'
    ]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test('Message list batch-loads all author summaries once', async () => {
    const authorA = new mongoose.Types.ObjectId();
    const authorB = new mongoose.Types.ObjectId();
    const calls = [];
    const ticketId = new mongoose.Types.ObjectId();
    const rows = [authorB, authorA, authorA].map((authorUserId, index) => ({
        _id: new mongoose.Types.ObjectId(), ticketId, authorUserId,
        content: `message-${index}`, isEdited: false, editedAt: null,
        isDeleted: false, deletedAt: null, version: 1,
        createdAt: new Date(1000 + index), updatedAt: new Date(1000 + index)
    }));
    const query = new TicketMessageQueryService({
        ticketRepository: { findById: async () => ({ _id: ticketId }) },
        authorizationService: { requireChatAccess: async () => ({}) },
        messageRepository: { listBefore: async () => ({ rows, hasMoreBefore: false }) },
        userSummaryService: {
            mapByIds: async (ids) => {
                calls.push(ids.map(String));
                return new Map([
                    [String(authorA), { id: String(authorA), displayName: 'A', email: null }],
                    [String(authorB), { id: String(authorB), displayName: 'B', email: null }]
                ]);
            }
        },
        capabilityService: { forMessage: () => ({ canEdit: false, canDelete: false }) }
    });
    const result = await query.list(new mongoose.Types.ObjectId(), ticketId, { limit: 50, before: null });
    assert.equal(result.items.length, 3);
    assert.equal(calls.length, 1);
    assert.deepEqual(new Set(calls[0]), new Set([String(authorA), String(authorB)]));
});

test('Ticket list path has no Message repository query or Message N+1 dependency', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'src/modules/tickets/services/TicketService.js'), 'utf8');
    assert.doesNotMatch(source, /messageRepository|TicketMessage|\.messages\s*\(/);
    assert.match(source, /assigneeSummaryService\.forTickets\(result\.items\)/);
});

test('canWriteChat remains independent from workflow isReadOnly', () => {
    const authorizationService = new TicketAuthorizationService({ scopeResolver: {} });
    const capabilityService = new TicketCapabilityService({ authorizationService });
    const systemId = new mongoose.Types.ObjectId();
    const roomId = new mongoose.Types.ObjectId();
    const ticket = { systemId, currentRoomId: roomId, visibleRoomIds: [roomId], status: 'CLOSED', activeTransferId: null };
    const access = {
        isActive: true, roomIds: [roomId], managedRoomIds: [],
        memberships: [{ role: ROLES.ROOM_USER, roomId, systemId }]
    };
    const capabilities = capabilityService.forTicket(access, ticket);
    assert.equal(capabilities.isReadOnly, true);
    assert.equal(capabilities.readOnlyReason, 'TICKET_CLOSED');
    assert.equal(capabilities.canWriteChat, true);
    const visibleWithoutActiveRoomAuthority = {
        isActive: true, roomIds: [], managedRoomIds: [],
        memberships: [{ role: ROLES.SUPER_ADMIN, systemId }]
    };
    const revoked = capabilityService.forTicket(visibleWithoutActiveRoomAuthority, ticket);
    assert.equal(revoked.canView, true);
    assert.equal(revoked.canWriteChat, false);
});