const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, before, beforeEach, test } = require('node:test');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const TicketMessage = require('../src/modules/tickets/messages/models/TicketMessage.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { createPhase7aFixture } = require('./helpers/phase7aFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
const createMessage = (actor, ticketId, content, clientMessageId = randomUUID()) =>
    services.tickets.messageService.create(actor._id, ticketId, { clientMessageId, content });
const listMessages = (actor, ticketId, query = {}) => services.tickets.messageQueryService.list(
    actor._id, ticketId, { limit: 50, before: null, ...query }
);

before(async () => { await connectTestDatabase(); services = createServiceContainer({ logger }); });
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('creation derives immutable metadata, is idempotent and leaves Ticket workflow untouched', async () => {
    const data = await createPhase7aFixture(services, 'create');
    const before = await Ticket.findById(data.ticket.id).lean();
    const historyCount = await TicketHistory.countDocuments({ ticketId: data.ticket.id });
    const clientMessageId = randomUUID();
    const events = [];
    const original = services.tickets.messageRealtimePublisher.publish.bind(
        services.tickets.messageRealtimePublisher
    );
    services.tickets.messageRealtimePublisher.publish = (...args) => events.push(args);
    try {
        const created = await createMessage(data.users.sourceUser, data.ticket.id, 'הודעה ראשונה', clientMessageId);
        const replay = await createMessage(data.users.sourceUser, data.ticket.id, 'הודעה ראשונה', clientMessageId);
        assert.equal(created.replayed, false);
        assert.equal(replay.replayed, true);
        assert.equal(replay.message.id, created.message.id);
        assert.equal(replay.acknowledgement.clientMessageId, clientMessageId);
        assert.equal(events.length, 1);
        await assert.rejects(
            createMessage(data.users.sourceUser, data.ticket.id, 'תוכן אחר', clientMessageId),
            (error) => error.code === 'MESSAGE_IDEMPOTENCY_CONFLICT'
        );
    } finally {
        services.tickets.messageRealtimePublisher.publish = original;
    }
    const [afterTicket, stored] = await Promise.all([
        Ticket.findById(data.ticket.id).lean(), TicketMessage.findOne({ ticketId: data.ticket.id }).lean()
    ]);
    assert.equal(await TicketMessage.countDocuments({ ticketId: data.ticket.id }), 1);
    assert.equal(stored.ticketNumber, data.ticket.ticketNumber);
    assert.equal(String(stored.systemId), String(data.system._id));
    assert.equal(String(stored.authorUserId), String(data.users.sourceUser._id));
    assert.equal(afterTicket.version, before.version);
    assert.equal(afterTicket.updatedAt.toISOString(), before.updatedAt.toISOString());
    assert.equal(await TicketHistory.countDocuments({ ticketId: data.ticket.id }), historyCount);
});

test('message list returns newest page in chronological display order with stable before cursors', async () => {
    const data = await createPhase7aFixture(services, 'pagination');
    const createdIds = [];
    for (let index = 1; index <= 5; index += 1) {
        const result = await createMessage(data.users.sourceUser, data.ticket.id, `message-${index}`);
        createdIds.push(result.message.id);
    }
    const newest = await listMessages(data.users.sourceUser, data.ticket.id, { limit: 2 });
    assert.deepEqual(newest.items.map((item) => item.id), createdIds.slice(3));
    assert.equal(newest.pageInfo.hasMoreBefore, true);
    assert.ok(newest.pageInfo.nextBeforeCursor);
    const middle = await listMessages(data.users.sourceUser, data.ticket.id, {
        limit: 2,
        before: require('../src/modules/tickets/messages/domain/message.cursor.js')
            .decodeMessageCursor(newest.pageInfo.nextBeforeCursor)
    });
    assert.deepEqual(middle.items.map((item) => item.id), createdIds.slice(1, 3));
    assert.equal(new Set([...newest.items, ...middle.items].map((item) => item.id)).size, 4);
    const oldest = await listMessages(data.users.sourceUser, data.ticket.id, {
        limit: 2,
        before: require('../src/modules/tickets/messages/domain/message.cursor.js')
            .decodeMessageCursor(middle.pageInfo.nextBeforeCursor)
    });
    assert.deepEqual(oldest.items.map((item) => item.id), createdIds.slice(0, 1));
    assert.equal(oldest.pageInfo.hasMoreBefore, false);
    assert.equal(oldest.pageInfo.nextBeforeCursor, null);
});

test('one continuous stream survives A to B to C transfers and remains writable after closure', async () => {
    const data = await createPhase7aFixture(services, 'continuity');
    await createMessage(data.users.sourceUser, data.ticket.id, 'Room A before transfer');
    const first = await services.tickets.transferService.initiate(
        data.users.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.rooms.b._id, reason: 'Move chat to room B workflow' }
    );
    await createMessage(data.users.sourceUser, data.ticket.id, 'Room A remains visible');
    await createMessage(data.users.destinationUser, data.ticket.id, 'Room B during pending transfer');
    await services.tickets.transferService.accept(
        data.users.destinationManager._id, first.transfer.id, 2
    );
    const second = await services.tickets.transferService.initiate(
        data.users.destinationManager._id, data.ticket.id, 3,
        { destinationRoomId: data.rooms.c._id, reason: 'Move workflow onward to room C' }
    );
    await services.tickets.transferService.accept(data.users.thirdManager._id, second.transfer.id, 4);
    await createMessage(data.users.thirdManager, data.ticket.id, 'Room C same stream');
    await services.tickets.ticketService.close(
        data.users.thirdManager._id, data.ticket.id, 5, 'Ticket workflow completed'
    );
    const afterClose = await createMessage(data.users.sourceUser, data.ticket.id, 'Chat remains open after close');
    assert.equal(afterClose.message.content, 'Chat remains open after close');
    const list = await listMessages(data.users.destinationUser, data.ticket.id);
    assert.deepEqual(list.items.map((item) => item.content), [
        'Room A before transfer', 'Room A remains visible', 'Room B during pending transfer',
        'Room C same stream', 'Chat remains open after close'
    ]);
    const closedView = await services.tickets.ticketService.get(data.users.sourceUser._id, data.ticket.id);
    assert.equal(closedView.capabilities.isReadOnly, true);
    assert.equal(closedView.capabilities.readOnlyReason, 'TICKET_CLOSED');
    assert.equal(closedView.capabilities.canWriteChat, true);
});

test('unrelated, revoked and creator-only users cannot use chat while all canonical scoped roles can', async () => {
    const data = await createPhase7aFixture(services, 'authorization');
    for (const actor of [
        data.users.sourceUser, data.users.sourceManager, data.users.systemAdmin, data.users.superAdmin
    ]) {
        const result = await createMessage(actor, data.ticket.id, `allowed-${actor.displayName}`);
        assert.equal(result.message.capabilities.canEdit, true);
    }
    await assert.rejects(
        createMessage(data.users.unrelated, data.ticket.id, 'forbidden'),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
    await OrganizationMembership.updateMany(
        { userId: data.users.sourceUser._id }, { $set: { isActive: false } }
    );
    await assert.rejects(
        listMessages(data.users.sourceUser, data.ticket.id),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
});

test('only the current author may edit or soft-delete and Message concurrency is independent', async () => {
    const data = await createPhase7aFixture(services, 'ownership');
    const created = await createMessage(data.users.sourceUser, data.ticket.id, 'original');
    for (const actor of [
        data.users.sourceManager, data.users.systemAdmin, data.users.superAdmin
    ]) {
        await assert.rejects(
            services.tickets.messageService.edit(actor._id, data.ticket.id, created.message.id, 1, 'override'),
            (error) => error.code === 'MESSAGE_NOT_AUTHORED_BY_ACTOR'
        );
    }
    const edited = await services.tickets.messageService.edit(
        data.users.sourceUser._id, data.ticket.id, created.message.id, 1, 'edited content'
    );
    assert.equal(edited.version, 2);
    assert.equal(edited.isEdited, true);
    assert.ok(edited.editedAt);
    await assert.rejects(
        services.tickets.messageService.edit(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 1, 'stale content'
        ),
        (error) => error.code === 'MESSAGE_VERSION_CONFLICT'
    );
    const deleted = await services.tickets.messageService.delete(
        data.users.sourceUser._id, data.ticket.id, created.message.id, 2
    );
    assert.equal(deleted.version, 3);
    assert.equal(deleted.content, null);
    assert.equal(deleted.isDeleted, true);
    assert.deepEqual(deleted.capabilities, { canEdit: false, canDelete: false });
    const stored = await TicketMessage.findById(created.message.id).lean();
    assert.equal(stored.content, null);
    assert.equal(String(stored.deletedBy), String(data.users.sourceUser._id));
    await assert.rejects(
        services.tickets.messageService.delete(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 3
        ),
        (error) => error.code === 'MESSAGE_ALREADY_DELETED'
    );
    const listed = await listMessages(data.users.sourceUser, data.ticket.id);
    assert.equal(listed.items[0].content, null);
    assert.equal(listed.items[0].isDeleted, true);
});

test('author access is rechecked before edit and delete', async () => {
    const data = await createPhase7aFixture(services, 'recheck');
    const first = await createMessage(data.users.sourceUser, data.ticket.id, 'edit after revoke');
    const second = await createMessage(data.users.sourceUser, data.ticket.id, 'delete after revoke');
    await OrganizationMembership.updateMany(
        { userId: data.users.sourceUser._id }, { $set: { isActive: false } }
    );
    await assert.rejects(
        services.tickets.messageService.edit(
            data.users.sourceUser._id, data.ticket.id, first.message.id, 1, 'not allowed'
        ),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
    await assert.rejects(
        services.tickets.messageService.delete(
            data.users.sourceUser._id, data.ticket.id, second.message.id, 1
        ),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
});
