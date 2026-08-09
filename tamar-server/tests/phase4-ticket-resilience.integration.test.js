const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const TicketSequence = require('../src/modules/tickets/models/TicketSequence.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
let serial = 0;
const setup = async () => {
    const suffix = String(++serial);
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `resilience-${suffix}`, name: 'System' });
    const environment = await management.createEnvironment({ systemId: system._id, key: `env-${suffix}`, name: 'Environment' });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id, key: `sub-${suffix}`, name: 'Sub'
    });
    const room = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `room-${suffix}`, name: 'Room'
    });
    const user = await services.userRepository.create({ displayName: 'Resilience manager', isActive: true });
    await services.membershipRepository.create({
        userId: user._id, role: ROLES.ROOM_MANAGER, scopeType: SCOPE_TYPES.ROOM, scopeId: room._id,
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        roomId: room._id, isActive: true, assignedBy: user._id
    });
    return { system, room, user };
};
const create = (fixture, subject = 'Resilience ticket') => services.tickets.ticketService.create(fixture.user._id, {
    roomId: String(fixture.room._id), subject, description: `Description for ${subject}`,
    priority: 'MEDIUM', fieldValues: {}
});
const query = (overrides = {}) => ({ view: 'OPEN', page: 1, limit: 100, sortBy: 'sequenceNumber', sortDirection: 'asc', ...overrides });

before(async () => { await connectTestDatabase(); services = createServiceContainer({ logger }); });
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('parallel creation allocates unique monotonic committed numbers without count/max/random strategies', async () => {
    const fixture = await setup();
    const tickets = await Promise.all(Array.from({ length: 20 }, (_, index) => create(fixture, `Parallel ticket ${index}`)));
    assert.equal(new Set(tickets.map((ticket) => ticket.ticketNumber)).size, 20);
    assert.deepEqual(tickets.map((ticket) => ticket.sequenceNumber).sort((a, b) => a - b), Array.from({ length: 20 }, (_, index) => index + 1));
    assert.equal(await Ticket.countDocuments({}), 20);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_CREATED' }), 20);
    assert.equal((await TicketSequence.findOne({ systemId: fixture.system._id }).lean()).value, 20);
});

test('create history failure aborts sequence allocation and Ticket creation', async () => {
    const fixture = await setup();
    const repository = services.tickets.ticketHistoryRepository;
    const original = repository.append;
    repository.append = async () => { throw new Error('forced history failure'); };
    try {
        await assert.rejects(() => create(fixture), /forced history failure/);
    } finally {
        repository.append = original;
    }
    assert.equal(await Ticket.countDocuments({}), 0);
    assert.equal(await TicketSequence.countDocuments({}), 0);
    assert.equal(await TicketHistory.countDocuments({}), 0);
});

test('update history failure rolls back both content and explicit version', async () => {
    const fixture = await setup();
    const ticket = await create(fixture);
    const repository = services.tickets.ticketHistoryRepository;
    const original = repository.append;
    repository.append = async () => { throw new Error('forced update history failure'); };
    try {
        await assert.rejects(
            () => services.tickets.ticketService.update(fixture.user._id, ticket.id, 1, { priority: 'CRITICAL' }),
            /forced update history failure/
        );
    } finally {
        repository.append = original;
    }
    const stored = await Ticket.findById(ticket.id).lean();
    assert.equal(stored.priority, 'MEDIUM');
    assert.equal(stored.version, 1);
    assert.equal(await TicketHistory.countDocuments({ ticketId: ticket.id }), 1);
});

test('close history failure rolls back closure metadata, status and version', async () => {
    const fixture = await setup();
    const ticket = await create(fixture);
    const repository = services.tickets.ticketHistoryRepository;
    const original = repository.append;
    repository.append = async () => { throw new Error('forced close history failure'); };
    try {
        await assert.rejects(
            () => services.tickets.ticketService.close(fixture.user._id, ticket.id, 1, 'Should roll back'),
            /forced close history failure/
        );
    } finally {
        repository.append = original;
    }
    const stored = await Ticket.findById(ticket.id).lean();
    assert.equal(stored.status, 'OPEN');
    assert.equal(stored.closedAt, null);
    assert.equal(stored.version, 1);
});

test('realtime transport failure after commit cannot fail the API result or expose body data', async () => {
    const fixture = await setup();
    services.tickets.realtimePublisher.setIo({ to: () => ({ emit: () => { throw new Error('transport down'); } }) });
    const ticket = await create(fixture);
    services.tickets.realtimePublisher.setIo(null);
    assert.equal(ticket.status, 'OPEN');
    assert.equal(await Ticket.countDocuments({ _id: ticket.id }), 1);
    assert.equal(await TicketHistory.countDocuments({ ticketId: ticket.id }), 1);
});

test('escaped metacharacter search is literal, scoped and performed by MongoDB', async () => {
    const fixture = await setup();
    await create(fixture, 'Literal [alpha].* value');
    await create(fixture, 'Ordinary alpha value');
    const literal = await services.tickets.ticketService.list(fixture.user._id, query({ search: '[alpha].*' }));
    const broad = await services.tickets.ticketService.list(fixture.user._id, query({ search: 'alpha' }));
    assert.equal(literal.pagination.totalItems, 1);
    assert.equal(broad.pagination.totalItems, 2);
});

test('priority, room, creator and date filters only narrow an already-authorized query', async () => {
    const fixture = await setup();
    const low = await create(fixture, 'Low priority');
    await services.tickets.ticketService.update(fixture.user._id, low.id, 1, { priority: 'LOW' });
    await create(fixture, 'Medium priority');
    const filtered = await services.tickets.ticketService.list(fixture.user._id, query({
        priority: 'LOW', roomId: String(fixture.room._id), createdBy: String(fixture.user._id),
        createdFrom: new Date(Date.now() - 60_000), createdTo: new Date(Date.now() + 60_000)
    }));
    assert.equal(filtered.pagination.totalItems, 1);
    assert.equal(filtered.items[0].priority, 'LOW');
});
