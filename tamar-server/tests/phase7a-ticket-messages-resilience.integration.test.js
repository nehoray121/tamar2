const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, before, beforeEach, test } = require('node:test');
const TicketMessage = require('../src/modules/tickets/messages/models/TicketMessage.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { createPhase7aFixture } = require('./helpers/phase7aFixture.js');

const warnings = [];
const logger = { info() {}, warn: (...args) => warnings.push(args), error() {}, debug() {} };
let services;

before(async () => { await connectTestDatabase(); services = createServiceContainer({ logger }); });
beforeEach(async () => { warnings.length = 0; await clearTestCollections(); });
after(dropAndDisconnectTestDatabase);

test('concurrent identical creates produce one document, one event and replay acknowledgements', async () => {
    const data = await createPhase7aFixture(services, 'concurrent-create');
    const clientMessageId = randomUUID();
    const events = [];
    const original = services.tickets.messageRealtimePublisher.publish.bind(
        services.tickets.messageRealtimePublisher
    );
    services.tickets.messageRealtimePublisher.publish = (...args) => events.push(args);
    try {
        const results = await Promise.all([
            services.tickets.messageService.create(data.users.sourceUser._id, data.ticket.id, {
                clientMessageId, content: 'same retry-safe content'
            }),
            services.tickets.messageService.create(data.users.sourceUser._id, data.ticket.id, {
                clientMessageId, content: 'same retry-safe content'
            })
        ]);
        assert.deepEqual(results.map((item) => item.replayed).sort(), [false, true]);
        assert.equal(results[0].message.id, results[1].message.id);
        assert.equal(events.length, 1);
    } finally {
        services.tickets.messageRealtimePublisher.publish = original;
    }
    assert.equal(await TicketMessage.countDocuments({ ticketId: data.ticket.id }), 1);
});

test('concurrent edits with one expected version allow exactly one success', async () => {
    const data = await createPhase7aFixture(services, 'concurrent-edit');
    const created = await services.tickets.messageService.create(data.users.sourceUser._id, data.ticket.id, {
        clientMessageId: randomUUID(), content: 'original'
    });
    const settled = await Promise.allSettled([
        services.tickets.messageService.edit(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 1, 'first writer'
        ),
        services.tickets.messageService.edit(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 1, 'second writer'
        )
    ]);
    assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(settled.filter((item) => item.status === 'rejected').length, 1);
    assert.equal(settled.find((item) => item.status === 'rejected').reason.code, 'MESSAGE_VERSION_CONFLICT');
    const stored = await TicketMessage.findById(created.message.id).lean();
    assert.equal(stored.version, 2);
    assert.ok(['first writer', 'second writer'].includes(stored.content));
});

test('concurrent edit and delete cannot leave edited content after a successful tombstone', async () => {
    const data = await createPhase7aFixture(services, 'edit-delete');
    const created = await services.tickets.messageService.create(data.users.sourceUser._id, data.ticket.id, {
        clientMessageId: randomUUID(), content: 'race source'
    });
    const settled = await Promise.allSettled([
        services.tickets.messageService.edit(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 1, 'edited race'
        ),
        services.tickets.messageService.delete(
            data.users.sourceUser._id, data.ticket.id, created.message.id, 1
        )
    ]);
    assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(settled.filter((item) => item.status === 'rejected').length, 1);
    const stored = await TicketMessage.findById(created.message.id).lean();
    assert.equal(stored.version, 2);
    if (stored.isDeleted) {
        assert.equal(stored.content, null);
        assert.ok(stored.deletedAt);
    } else {
        assert.equal(stored.content, 'edited race');
        assert.equal(stored.isEdited, true);
    }
});

test('Socket.IO transport failure is logged but cannot invalidate an already persisted message', async () => {
    const data = await createPhase7aFixture(services, 'realtime-failure');
    services.tickets.messageRealtimePublisher.setIo({
        to: () => ({ emit: () => { throw new Error('forced socket failure'); } })
    });
    const result = await services.tickets.messageService.create(data.users.sourceUser._id, data.ticket.id, {
        clientMessageId: randomUUID(), content: 'persist despite transport failure'
    });
    assert.equal(result.message.content, 'persist despite transport failure');
    assert.equal(await TicketMessage.countDocuments({ _id: result.message.id }), 1);
    assert.equal(warnings.length, 1);
    services.tickets.messageRealtimePublisher.setIo(null);
});
