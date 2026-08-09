const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { createPhase7aFixture } = require('./helpers/phase7aFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
const assertChatCapability = (dto, label) => {
    assert.ok(dto?.capabilities, `${label} capabilities`);
    assert.equal(dto.capabilities.canWriteChat, true, `${label} canWriteChat`);
};
const openQuery = {
    view: 'OPEN', page: 1, limit: 25, sortBy: 'updatedAt', sortDirection: 'desc'
};

before(async () => {
    await connectTestDatabase();
    services = createServiceContainer({ logger });
});
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('every Ticket response path uses the central canWriteChat capability', async () => {
    const data = await createPhase7aFixture(services, 'v-capability-paths');
    const createdDto = data.ticket;
    assertChatCapability(createdDto, 'POST Ticket creation');

    const listed = await services.tickets.ticketService.list(
        data.users.sourceManager._id, openQuery
    );
    assert.equal(listed.items.length, 1);
    assertChatCapability(listed.items[0], 'GET Ticket list');

    const detail = await services.tickets.ticketService.get(
        data.users.sourceManager._id, data.ticket.id
    );
    assertChatCapability(detail, 'GET Ticket detail');

    const updated = await services.tickets.ticketService.update(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { subject: 'Updated capability response' }
    );
    assertChatCapability(updated, 'PATCH Ticket');

    const assigned = await services.tickets.assignmentService.replace(
        data.users.sourceManager._id,
        data.ticket.id,
        2,
        [String(data.users.sourceUser._id)]
    );
    assertChatCapability(assigned, 'Assignment mutation');

    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        3,
        { destinationRoomId: data.rooms.b._id, reason: 'Capability response initiation' }
    );
    assertChatCapability(initiated.ticket, 'Transfer initiation Ticket');
    assertChatCapability({ capabilities: initiated.transfer.capabilities }, 'Transfer initiation payload');

    const accepted = await services.tickets.transferService.accept(
        data.users.destinationManager._id,
        initiated.transfer.id,
        4
    );
    assertChatCapability(accepted.ticket, 'Transfer acceptance Ticket');
    assertChatCapability({ capabilities: accepted.transfer.capabilities }, 'Transfer acceptance payload');

    const closed = await services.tickets.ticketService.close(
        data.users.destinationUser._id,
        data.ticket.id,
        5,
        'Capability remains after closure'
    );
    assert.equal(closed.capabilities.isReadOnly, true);
    assertChatCapability(closed, 'POST Ticket close');
});

test('Transfer cancellation response exposes the same central canWriteChat capability', async () => {
    const data = await createPhase7aFixture(services, 'v-capability-cancel');
    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Capability cancellation path' }
    );
    const cancelled = await services.tickets.transferService.cancel(
        data.users.destinationManager._id,
        initiated.transfer.id,
        2,
        'Destination declined this transfer'
    );
    assertChatCapability(cancelled.ticket, 'Transfer cancellation Ticket');
    assertChatCapability({ capabilities: cancelled.transfer.capabilities }, 'Transfer cancellation payload');
});

test('authorization loss removes Message access instead of returning a stale true capability', async () => {
    const data = await createPhase7aFixture(services, 'v-capability-revoked');
    const before = await services.tickets.ticketService.get(
        data.users.sourceUser._id, data.ticket.id
    );
    assertChatCapability(before, 'before revocation');
    await OrganizationMembership.updateMany(
        { userId: data.users.sourceUser._id }, { $set: { isActive: false } }
    );
    await assert.rejects(
        services.tickets.ticketService.get(data.users.sourceUser._id, data.ticket.id),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
    await assert.rejects(
        services.tickets.messageQueryService.list(data.users.sourceUser._id, data.ticket.id, {
            limit: 25, before: null
        }),
        (error) => error.code === 'TICKET_NOT_FOUND'
    );
});
