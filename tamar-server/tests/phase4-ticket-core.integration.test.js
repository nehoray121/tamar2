const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const TicketSequence = require('../src/modules/tickets/models/TicketSequence.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
const baseQuery = (overrides = {}) => ({
    view: 'OPEN', page: 1, limit: 25, sortBy: 'updatedAt', sortDirection: 'desc', ...overrides
});
const createUser = (name) => services.userRepository.create({ displayName: name, isActive: true });
const createHierarchy = async (suffix = 'main', systemKey = `system-${suffix}`) => {
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: systemKey, name: `System ${suffix}` });
    const environment = await management.createEnvironment({ systemId: system._id, key: `env-${suffix}`, name: 'Environment' });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id, key: `sub-${suffix}`, name: 'SubEnvironment'
    });
    const room = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `room-${suffix}`, name: 'Room'
    });
    return { system, environment, subEnvironment, room };
};
const addMembership = (user, role, graph) => {
    const roomRole = [ROLES.ROOM_MANAGER, ROLES.ROOM_USER].includes(role);
    const subRole = role === ROLES.SYSTEM_ADMIN;
    return services.membershipRepository.create({
        userId: user._id, role,
        scopeType: roomRole ? SCOPE_TYPES.ROOM : (subRole ? SCOPE_TYPES.SUB_ENVIRONMENT : SCOPE_TYPES.SYSTEM),
        scopeId: roomRole ? graph.room._id : (subRole ? graph.subEnvironment._id : graph.system._id),
        systemId: graph.system._id,
        environmentId: roomRole || subRole ? graph.environment._id : undefined,
        subEnvironmentId: roomRole || subRole ? graph.subEnvironment._id : undefined,
        roomId: roomRole ? graph.room._id : undefined,
        isActive: true, assignedBy: user._id
    });
};
const createTicket = (user, graph, overrides = {}) => services.tickets.ticketService.create(user._id, {
    roomId: String(graph.room._id),
    subject: 'Core ticket',
    description: 'Ticket description',
    priority: 'MEDIUM',
    fieldValues: { source: 'integration' },
    ...overrides
});

before(async () => {
    await connectTestDatabase();
    services = createServiceContainer({ logger });
});
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('all four canonical roles may create in their exact operational scope', async () => {
    const graph = await createHierarchy();
    for (const role of Object.values(ROLES)) {
        const user = await createUser(role);
        await addMembership(user, role, graph);
        const ticket = await createTicket(user, graph, { subject: `Ticket for ${role}` });
        assert.equal(ticket.status, 'OPEN');
        assert.equal(ticket.version, 1);
        assert.equal(ticket.currentRoomId, String(graph.room._id));
        assert.deepEqual(ticket.visibleRoomIds, [String(graph.room._id)]);
    }
    assert.equal(await Ticket.countDocuments({}), 4);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_CREATED' }), 4);
});

test('atomic sequence is per System, monotonic and produces a globally unique formatted ticket number', async () => {
    const first = await createHierarchy('one');
    const second = await createHierarchy('two');
    const user = await createUser('Numbering user');
    await addMembership(user, ROLES.SUPER_ADMIN, first);
    await addMembership(user, ROLES.SUPER_ADMIN, second);
    const one = await createTicket(user, first);
    const two = await createTicket(user, first, { subject: 'Second ticket' });
    const other = await createTicket(user, second);
    assert.equal(one.ticketNumber, 'SYSTEM-ONE-00000001');
    assert.equal(two.ticketNumber, 'SYSTEM-ONE-00000002');
    assert.equal(other.ticketNumber, 'SYSTEM-TWO-00000001');
    assert.equal(new Set([one.ticketNumber, two.ticketNumber, other.ticketNumber]).size, 3);
});

test('failed creation transaction rolls back sequence, ticket and history writes', async () => {
    const graph = await createHierarchy('unsafe', 'מערכת');
    const user = await createUser('Unsafe prefix user');
    await addMembership(user, ROLES.SUPER_ADMIN, graph);
    await assert.rejects(() => createTicket(user, graph), (error) => error.code === 'TICKET_NUMBER_ALLOCATION_FAILED');
    assert.equal(await TicketSequence.countDocuments({ systemId: graph.system._id }), 0);
    assert.equal(await Ticket.countDocuments({ systemId: graph.system._id }), 0);
    assert.equal(await TicketHistory.countDocuments({ systemId: graph.system._id }), 0);
});

test('unauthorized or missing ticket detail is consistently masked as TICKET_NOT_FOUND', async () => {
    const allowed = await createHierarchy('allowed');
    const denied = await createHierarchy('denied');
    const owner = await createUser('Owner');
    const stranger = await createUser('Stranger');
    await addMembership(owner, ROLES.ROOM_USER, allowed);
    await addMembership(stranger, ROLES.ROOM_MANAGER, denied);
    const ticket = await createTicket(owner, allowed);
    await assert.rejects(() => services.tickets.ticketService.get(stranger._id, ticket.id), (error) => error.code === 'TICKET_NOT_FOUND' && error.statusCode === 404);
    await assert.rejects(() => services.tickets.ticketService.get(stranger._id, new mongoose.Types.ObjectId()), (error) => error.code === 'TICKET_NOT_FOUND');
});

test('ROOM_USER may close but cannot edit, even when the user created the ticket', async () => {
    const graph = await createHierarchy();
    const user = await createUser('Room user');
    await addMembership(user, ROLES.ROOM_USER, graph);
    const ticket = await createTicket(user, graph);
    await assert.rejects(
        () => services.tickets.ticketService.update(user._id, ticket.id, 1, { subject: 'Changed subject' }),
        (error) => error.code === 'TICKET_EDIT_FORBIDDEN'
    );
    const closed = await services.tickets.ticketService.close(user._id, ticket.id, 1, 'Resolved by room user');
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.version, 2);
    assert.equal(closed.capabilities.isReadOnly, true);
    assert.equal(closed.capabilities.readOnlyReason, 'TICKET_CLOSED');
});

test('manager update uses optimistic concurrency, increments once and appends bounded history', async () => {
    const graph = await createHierarchy();
    const manager = await createUser('Manager');
    await addMembership(manager, ROLES.ROOM_MANAGER, graph);
    const ticket = await createTicket(manager, graph);
    const updated = await services.tickets.ticketService.update(manager._id, ticket.id, 1, {
        subject: 'Updated subject', description: 'x'.repeat(500)
    });
    assert.equal(updated.version, 2);
    assert.equal(updated.subject, 'Updated subject');
    await assert.rejects(
        () => services.tickets.ticketService.update(manager._id, ticket.id, 1, { priority: 'HIGH' }),
        (error) => error.code === 'VERSION_CONFLICT'
    );
    const history = await TicketHistory.findOne({ ticketId: ticket.id, eventType: 'TICKET_UPDATED' }).lean();
    assert.deepEqual(history.changedFields.sort(), ['description', 'subject']);
    assert.ok(history.changes.description.after.length < 300);
});

test('empty semantic update is rejected and creates no history event or version change', async () => {
    const graph = await createHierarchy();
    const manager = await createUser('Manager');
    await addMembership(manager, ROLES.ROOM_MANAGER, graph);
    const ticket = await createTicket(manager, graph);
    await assert.rejects(
        () => services.tickets.ticketService.update(manager._id, ticket.id, 1, { subject: ticket.subject }),
        (error) => error.code === 'EMPTY_UPDATE'
    );
    assert.equal((await Ticket.findById(ticket.id).lean()).version, 1);
    assert.equal(await TicketHistory.countDocuments({ ticketId: ticket.id }), 1);
});

test('closed ticket cannot be edited, closed again, reopened or moved by Phase 4 updates', async () => {
    const graph = await createHierarchy();
    const manager = await createUser('Manager');
    await addMembership(manager, ROLES.ROOM_MANAGER, graph);
    const ticket = await createTicket(manager, graph);
    await services.tickets.ticketService.close(manager._id, ticket.id, 1, 'Completed work');
    await assert.rejects(() => services.tickets.ticketService.close(manager._id, ticket.id, 2, 'Again'), (error) => error.code === 'TICKET_ALREADY_CLOSED');
    await assert.rejects(() => services.tickets.ticketService.update(manager._id, ticket.id, 2, { subject: 'Cannot edit' }), (error) => error.code === 'TICKET_NOT_OPEN');
    const stored = await Ticket.findById(ticket.id).lean();
    assert.equal(String(stored.currentRoomId), String(graph.room._id));
    assert.equal(stored.activeTransferId, null);
});

test('OPEN, HISTORY and MY_TASKS views are scope-constrained and return stable pagination metadata', async () => {
    const graph = await createHierarchy();
    const other = await createHierarchy('other');
    const user = await createUser('List user');
    const outsider = await createUser('Other creator');
    await addMembership(user, ROLES.ROOM_MANAGER, graph);
    await addMembership(outsider, ROLES.ROOM_MANAGER, other);
    const own = await createTicket(user, graph, { subject: 'Searchable alpha' });
    await createTicket(user, graph, { subject: 'Searchable beta' });
    await createTicket(outsider, other, { subject: 'Searchable hidden' });
    await services.tickets.ticketService.close(user._id, own.id, 1, 'Moved to history');
    const open = await services.tickets.ticketService.list(user._id, baseQuery({ search: 'Searchable' }));
    const history = await services.tickets.ticketService.list(user._id, baseQuery({ view: 'HISTORY', sortBy: 'closedAt' }));
    const tasks = await services.tickets.ticketService.list(user._id, baseQuery({ view: 'MY_TASKS' }));
    assert.equal(open.pagination.totalItems, 1);
    assert.equal(history.pagination.totalItems, 1);
    assert.equal(tasks.pagination.totalItems, 1);
    assert.equal(open.pagination.hasPrevious, false);
    assert.equal(open.items.some((item) => item.subject.includes('hidden')), false);
});

test('history API is authorization-scoped, chronological, paginated and append-only', async () => {
    const graph = await createHierarchy();
    const manager = await createUser('Manager');
    await addMembership(manager, ROLES.ROOM_MANAGER, graph);
    const ticket = await createTicket(manager, graph);
    await services.tickets.ticketService.update(manager._id, ticket.id, 1, { priority: 'HIGH' });
    await services.tickets.ticketService.close(manager._id, ticket.id, 2, 'Completed');
    const result = await services.tickets.ticketService.history(manager._id, ticket.id, { page: 1, limit: 2, sortDirection: 'asc' });
    assert.equal(result.pagination.totalItems, 3);
    assert.deepEqual(result.items.map((entry) => entry.eventType), ['TICKET_CREATED', 'TICKET_UPDATED']);
    await assert.rejects(() => TicketHistory.updateOne({ ticketId: ticket.id }, { $set: { eventType: 'TICKET_CREATED' } }), (error) => error.code === 'TICKET_HISTORY_IMMUTABLE');
    await assert.rejects(() => TicketHistory.deleteOne({ ticketId: ticket.id }), (error) => error.code === 'TICKET_HISTORY_IMMUTABLE');
});

test('inactive organization chain blocks ticket creation without creating business records', async () => {
    const graph = await createHierarchy();
    const user = await createUser('Inactive scope user');
    await addMembership(user, ROLES.ROOM_MANAGER, graph);
    await services.organization.lifecycleService.deactivateEntity('ROOM', graph.room._id, user._id);
    await assert.rejects(() => createTicket(user, graph), (error) => error.code === 'TICKET_SCOPE_INACTIVE');
    assert.equal(await Ticket.countDocuments({}), 0);
    assert.equal(await TicketHistory.countDocuments({}), 0);
});

test('model indexes enforce global ticket number and per-system sequence uniqueness', async () => {
    const graph = await createHierarchy();
    const user = await createUser('Index user');
    await addMembership(user, ROLES.ROOM_MANAGER, graph);
    const ticket = await createTicket(user, graph);
    const stored = await Ticket.findById(ticket.id).lean();
    const duplicate = { ...stored, _id: new mongoose.Types.ObjectId(), createdAt: undefined, updatedAt: undefined };
    await assert.rejects(() => Ticket.create(duplicate), (error) => error.code === 11000);
});

test('ticket history does not store identity claims, descriptions, field values or full request bodies', async () => {
    const graph = await createHierarchy();
    const user = await createUser('Privacy user');
    await addMembership(user, ROLES.ROOM_MANAGER, graph);
    const ticket = await createTicket(user, graph, { description: 'TOP-SECRET-DESCRIPTION', fieldValues: { password: 'TOP-SECRET-FIELD' } });
    const serialized = JSON.stringify(await TicketHistory.find({ ticketId: ticket.id }).lean());
    assert.doesNotMatch(serialized, /TOP-SECRET|authorization|token|membership|personalNumber/i);
});
