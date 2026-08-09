const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const Room = require('../src/models/Room.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const TicketMessage = require('../src/modules/tickets/messages/models/TicketMessage.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const {
    addMembership, createPhase7aFixture, createUser
} = require('./helpers/phase7aFixture.js');
const { ROLES } = require('../src/domain/access/constants.js');
const { decodeMessageCursor } = require('../src/modules/tickets/messages/domain/message.cursor.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;

const createMessage = (actor, data, content, clientMessageId = randomUUID()) =>
    services.tickets.messageService.create(actor._id, data.ticket.id, { clientMessageId, content });
const listMessages = (actor, data, options = {}) => services.tickets.messageQueryService.list(
    actor._id, data.ticket.id, { limit: 50, before: null, ...options }
);
const roomGraph = (data) => ({
    system: data.system,
    environment: data.environment,
    subEnvironment: data.subEnvironment,
    room: data.rooms.a
});

before(async () => {
    await connectTestDatabase();
    services = createServiceContainer({ logger });
});
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('TicketMessage persists required immutable identity and initial state invariants', async () => {
    const data = await createPhase7aFixture(services, 'v-model-identity');
    const created = await createMessage(data.users.sourceUser, data, 'immutable identity');
    const original = await TicketMessage.findById(created.message.id).lean();
    assert.equal(String(original.ticketId), data.ticket.id);
    assert.equal(original.ticketNumber, data.ticket.ticketNumber);
    assert.equal(String(original.systemId), String(data.system._id));
    assert.equal(String(original.authorUserId), String(data.users.sourceUser._id));
    assert.equal(original.version, 1);
    assert.equal(original.isEdited, false);
    assert.equal(original.editedAt, null);
    assert.equal(original.isDeleted, false);
    assert.equal(original.deletedAt, null);
    assert.equal(original.deletedBy, null);

    await TicketMessage.findByIdAndUpdate(original._id, { $set: {
        ticketId: new mongoose.Types.ObjectId(),
        ticketNumber: 'MUTATED',
        systemId: new mongoose.Types.ObjectId(),
        authorUserId: new mongoose.Types.ObjectId(),
        clientMessageId: randomUUID()
    } }, { runValidators: true });
    const after = await TicketMessage.findById(original._id).lean();
    for (const field of ['ticketId', 'ticketNumber', 'systemId', 'authorUserId', 'clientMessageId']) {
        assert.equal(String(after[field]), String(original[field]), field);
    }
});

test('TicketMessage model rejects inconsistent live and deleted states', async () => {
    const base = {
        ticketId: new mongoose.Types.ObjectId(),
        ticketNumber: 'P7V-1',
        systemId: new mongoose.Types.ObjectId(),
        authorUserId: new mongoose.Types.ObjectId(),
        clientMessageId: randomUUID(),
        content: 'valid'
    };
    await assert.rejects(new TicketMessage({ ...base, content: null }).validate());
    await assert.rejects(new TicketMessage({
        ...base,
        isDeleted: true,
        content: 'hidden old content',
        deletedAt: new Date(),
        deletedBy: base.authorUserId
    }).validate());
    await assert.rejects(new TicketMessage({
        ...base,
        isDeleted: true,
        content: null,
        deletedAt: new Date(),
        deletedBy: new mongoose.Types.ObjectId()
    }).validate());
    await assert.rejects(new TicketMessage({ ...base, isEdited: true, editedAt: null }).validate());
});

test('parallel different-content idempotency reuse stores one deterministic Message', async () => {
    const data = await createPhase7aFixture(services, 'v-conflicting-create');
    const clientMessageId = randomUUID();
    const settled = await Promise.allSettled([
        createMessage(data.users.sourceUser, data, 'parallel alpha', clientMessageId),
        createMessage(data.users.sourceUser, data, 'parallel beta', clientMessageId)
    ]);
    assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 1);
    const rejected = settled.find((item) => item.status === 'rejected');
    assert.equal(rejected.reason.code, 'MESSAGE_IDEMPOTENCY_CONFLICT');
    const stored = await TicketMessage.find({ ticketId: data.ticket.id }).lean();
    assert.equal(stored.length, 1);
    assert.ok(['parallel alpha', 'parallel beta'].includes(stored[0].content));
});

test('concurrent duplicate delete creates one tombstone and one deterministic rejection', async () => {
    const data = await createPhase7aFixture(services, 'v-duplicate-delete');
    const created = await createMessage(data.users.sourceUser, data, 'delete once');
    const settled = await Promise.allSettled([
        services.tickets.messageService.delete(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 1
        ),
        services.tickets.messageService.delete(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 1
        )
    ]);
    assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(settled.filter((item) => item.status === 'rejected').length, 1);
    assert.ok(['MESSAGE_ALREADY_DELETED', 'MESSAGE_VERSION_CONFLICT'].includes(
        settled.find((item) => item.status === 'rejected').reason.code
    ));
    const stored = await TicketMessage.findById(created.message.id).lean();
    assert.equal(stored.isDeleted, true);
    assert.equal(stored.content, null);
    assert.equal(stored.version, 2);
});

test('equal-timestamp cursor pagination has no duplicates, skips, or unstable ordering', async () => {
    const data = await createPhase7aFixture(services, 'v-equal-time');
    const ids = [];
    for (let index = 0; index < 8; index += 1) {
        const result = await createMessage(data.users.sourceUser, data, `equal-${index}`);
        ids.push(result.message.id);
    }
    await services.tickets.messageService.delete(
        data.users.sourceUser._id, data.ticket.id, ids[3], 1
    );
    const timestamp = new Date('2026-07-21T09:00:00.000Z');
    await TicketMessage.collection.updateMany(
        { ticketId: new mongoose.Types.ObjectId(data.ticket.id) }, { $set: { createdAt: timestamp } }
    );
    const expected = (await TicketMessage.find({ ticketId: data.ticket.id })
        .sort({ createdAt: 1, _id: 1 }).lean()).map((item) => String(item._id));
    let before = null;
    let reconstructed = [];
    let pages = 0;
    do {
        const page = await listMessages(data.users.sourceUser, data, { limit: 3, before });
        reconstructed = [...page.items.map((item) => item.id), ...reconstructed];
        pages += 1;
        if (!page.pageInfo.hasMoreBefore) {
            assert.equal(page.pageInfo.nextBeforeCursor, null);
            break;
        }
        assert.ok(page.pageInfo.nextBeforeCursor);
        before = decodeMessageCursor(page.pageInfo.nextBeforeCursor);
    } while (pages < 10);
    assert.ok(pages > 1);
    assert.deepEqual(reconstructed, expected);
    assert.equal(new Set(reconstructed).size, expected.length);
    const tombstone = (await listMessages(data.users.sourceUser, data)).items
        .find((item) => item.id === ids[3]);
    assert.equal(tombstone.isDeleted, true);
    assert.equal(tombstone.content, null);
});

test('empty Ticket chat returns an empty stable page', async () => {
    const data = await createPhase7aFixture(services, 'v-empty-chat');
    const result = await listMessages(data.users.sourceUser, data, { limit: 25 });
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.pageInfo, {
        limit: 25, hasMoreBefore: false, nextBeforeCursor: null
    });
});

test('every non-author role including ROOM_USER is denied edit and delete overrides', async () => {
    const data = await createPhase7aFixture(services, 'v-all-role-ownership');
    const peer = await createUser(services, 'Peer Room User');
    await addMembership(services, peer, ROLES.ROOM_USER, roomGraph(data));
    const created = await createMessage(data.users.sourceUser, data, 'author owned');
    for (const actor of [
        peer,
        data.users.sourceManager,
        data.users.systemAdmin,
        data.users.superAdmin
    ]) {
        await assert.rejects(
            services.tickets.messageService.edit(
                actor._id, data.ticket.id, created.message.id, 1, `edit by ${actor.displayName}`
            ),
            (error) => error.code === 'MESSAGE_NOT_AUTHORED_BY_ACTOR'
        );
        await assert.rejects(
            services.tickets.messageService.delete(
                actor._id, data.ticket.id, created.message.id, 1
            ),
            (error) => error.code === 'MESSAGE_NOT_AUTHORED_BY_ACTOR'
        );
    }
});

test('author cannot mutate after hierarchy inactivation and deleted Message cannot be restored', async () => {
    const data = await createPhase7aFixture(services, 'v-author-hierarchy');
    const editTarget = await createMessage(data.users.sourceUser, data, 'blocked edit');
    const deleteTarget = await createMessage(data.users.sourceUser, data, 'blocked delete');
    await Room.updateOne({ _id: data.rooms.a._id }, { $set: { isActive: false } });
    await assert.rejects(
        services.tickets.messageService.edit(
            data.users.sourceUser._id, data.ticket.id, editTarget.message.id, 1, 'changed'
        ),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
    await assert.rejects(
        services.tickets.messageService.delete(
            data.users.sourceUser._id, data.ticket.id, deleteTarget.message.id, 1
        ),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
    await Room.updateOne({ _id: data.rooms.a._id }, { $set: { isActive: true } });
    const deleted = await services.tickets.messageService.delete(
        data.users.sourceUser._id, data.ticket.id, deleteTarget.message.id, 1
    );
    await assert.rejects(
        services.tickets.messageService.edit(
            data.users.sourceUser._id, data.ticket.id, deleted.id, 2, 'restore attempt'
        ),
        (error) => error.code === 'MESSAGE_CANNOT_EDIT_DELETED'
    );
    await assert.rejects(
        services.tickets.messageService.delete(
            data.users.sourceUser._id, data.ticket.id, deleted.id, 2
        ),
        (error) => error.code === 'MESSAGE_ALREADY_DELETED'
    );
});

test('closed Ticket chat supports create, author edit, author delete, and previous Room writes', async () => {
    const data = await createPhase7aFixture(services, 'v-closed-chat');
    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Close in destination room' }
    );
    await services.tickets.transferService.accept(
        data.users.destinationManager._id, initiated.transfer.id, 2
    );
    await services.tickets.ticketService.close(
        data.users.destinationUser._id, data.ticket.id, 3, 'Closed chat verification'
    );
    const current = await createMessage(data.users.destinationUser, data, 'current after close');
    const edited = await services.tickets.messageService.edit(
        data.users.destinationUser._id, data.ticket.id, current.message.id, 1, 'edited after close'
    );
    assert.equal(edited.content, 'edited after close');
    const deleted = await services.tickets.messageService.delete(
        data.users.destinationUser._id, data.ticket.id, current.message.id, 2
    );
    assert.equal(deleted.isDeleted, true);
    const previous = await createMessage(data.users.sourceUser, data, 'previous Room after close');
    assert.equal(previous.message.content, 'previous Room after close');
    await assert.rejects(
        createMessage(data.users.unrelated, data, 'unauthorized after close'),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
    const closedDto = await services.tickets.ticketService.get(
        data.users.sourceUser._id, data.ticket.id
    );
    assert.equal(closedDto.capabilities.isReadOnly, true);
    assert.equal(closedDto.capabilities.canWriteChat, true);
});

test('cancelled transfer preserves one writable stream for source and previously visible destination', async () => {
    const data = await createPhase7aFixture(services, 'v-cancelled-transfer-chat');
    await createMessage(data.users.sourceUser, data, 'before cancelled transfer');
    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Verify cancelled chat continuity' }
    );
    await createMessage(data.users.destinationUser, data, 'destination while pending');
    await services.tickets.transferService.cancel(
        data.users.destinationManager._id,
        initiated.transfer.id,
        2,
        'Destination returns ownership to source'
    );
    await createMessage(data.users.sourceUser, data, 'source after cancellation');
    const [sourceView, destinationView, sourceTicket, destinationTicket] = await Promise.all([
        listMessages(data.users.sourceUser, data),
        listMessages(data.users.destinationUser, data),
        services.tickets.ticketService.get(data.users.sourceUser._id, data.ticket.id),
        services.tickets.ticketService.get(data.users.destinationUser._id, data.ticket.id)
    ]);
    const expected = [
        'before cancelled transfer',
        'destination while pending',
        'source after cancellation'
    ];
    assert.deepEqual(sourceView.items.map((item) => item.content), expected);
    assert.deepEqual(destinationView.items.map((item) => item.content), expected);
    assert.equal(sourceTicket.capabilities.canWriteChat, true);
    assert.equal(destinationTicket.capabilities.canWriteChat, true);
});
test('Message create, edit, and delete never mutate Ticket workflow or TicketHistory', async () => {
    const data = await createPhase7aFixture(services, 'v-ticket-independence');
    const before = await Ticket.findById(data.ticket.id).lean();
    const historyBefore = await TicketHistory.countDocuments({ ticketId: data.ticket.id });
    const created = await createMessage(data.users.sourceUser, data, 'workflow independent');
    await services.tickets.messageService.edit(
        data.users.sourceUser._id, data.ticket.id, created.message.id, 1, 'still independent'
    );
    await services.tickets.messageService.delete(
        data.users.sourceUser._id, data.ticket.id, created.message.id, 2
    );
    const after = await Ticket.findById(data.ticket.id).lean();
    assert.equal(after.version, before.version);
    assert.equal(after.updatedAt.toISOString(), before.updatedAt.toISOString());
    assert.equal(await TicketHistory.countDocuments({ ticketId: data.ticket.id }), historyBefore);
});

test('soft deletion leaves one content-free tombstone and no hidden revision collection', async () => {
    const data = await createPhase7aFixture(services, 'v-no-hidden-delete');
    const secret = 'content that must not survive deletion';
    const created = await createMessage(data.users.sourceUser, data, secret);
    await services.tickets.messageService.delete(
        data.users.sourceUser._id, data.ticket.id, created.message.id, 1
    );
    const raw = await TicketMessage.collection.findOne({
        _id: new mongoose.Types.ObjectId(created.message.id)
    });
    assert.equal(raw.content, null);
    assert.equal(JSON.stringify(raw).includes(secret), false);
    assert.equal(Object.keys(raw).some((key) => /previous|revision|original|hidden/i.test(key)), false);
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    assert.equal(collections.some((item) => /ticketmessage.*(?:revision|history)/i.test(item.name)), false);
    assert.equal(await TicketMessage.countDocuments({ _id: raw._id }), 1);
});
