const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketAssignment = require('../src/modules/tickets/models/TicketAssignment.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
let counter = 0;
const addRoomMember = (user, role, graph) => services.membershipRepository.create({
    userId: user._id, role, scopeType: SCOPE_TYPES.ROOM, scopeId: graph.room._id,
    systemId: graph.system._id, environmentId: graph.environment._id,
    subEnvironmentId: graph.subEnvironment._id, roomId: graph.room._id,
    isActive: true, assignedBy: user._id
});
const fixture = async () => {
    counter += 1;
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `res-system-${counter}`, name: 'System' });
    const environment = await management.createEnvironment({ systemId: system._id, key: `res-env-${counter}`, name: 'Environment' });
    const subEnvironment = await management.createSubEnvironment({ systemId: system._id, environmentId: environment._id, key: `res-sub-${counter}`, name: 'Sub' });
    const room = await management.createRoom({ systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id, key: `res-room-${counter}`, name: 'Room' });
    const graph = { system, environment, subEnvironment, room };
    const actor = await services.userRepository.create({ displayName: 'Manager', isActive: true });
    const first = await services.userRepository.create({ displayName: 'First', isActive: true });
    const second = await services.userRepository.create({ displayName: 'Second', isActive: true });
    await addRoomMember(actor, ROLES.ROOM_MANAGER, graph);
    await addRoomMember(first, ROLES.ROOM_USER, graph);
    await addRoomMember(second, ROLES.ROOM_USER, graph);
    const ticket = await services.tickets.ticketService.create(actor._id, {
        roomId: String(room._id), subject: 'Resilience ticket', description: 'Transaction coverage', priority: 'MEDIUM'
    });
    return { actor, first, second, ticket };
};

before(async () => { await connectTestDatabase(); services = createServiceContainer({ logger }); });
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('TicketHistory failure rolls back assignment rows, activeAssigneeIds and version', async () => {
    const data = await fixture();
    const original = services.tickets.ticketHistoryRepository.append.bind(services.tickets.ticketHistoryRepository);
    services.tickets.ticketHistoryRepository.append = async () => { throw new Error('forced history failure'); };
    await assert.rejects(services.tickets.assignmentService.replace(
        data.actor._id, data.ticket.id, 1, [String(data.first._id)]
    ));
    services.tickets.ticketHistoryRepository.append = original;
    const ticket = await Ticket.findById(data.ticket.id).lean();
    assert.equal(ticket.version, 1);
    assert.deepEqual(ticket.activeAssigneeIds, []);
    assert.equal(await TicketAssignment.countDocuments({}), 0);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_ASSIGNEES_UPDATED' }), 0);
});

test('two concurrent writers with one expected version produce one commit and one VERSION_CONFLICT', async () => {
    const data = await fixture();
    const settled = await Promise.allSettled([
        services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.first._id)]),
        services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.second._id)])
    ]);
    assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 1);
    const rejected = settled.find((item) => item.status === 'rejected');
    assert.equal(rejected.reason.code, 'VERSION_CONFLICT');
    const ticket = await Ticket.findById(data.ticket.id).lean();
    assert.equal(ticket.version, 2);
    assert.equal(ticket.activeAssigneeIds.length, 1);
    assert.equal(await TicketAssignment.countDocuments({ isActive: true }), 1);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_ASSIGNEES_UPDATED' }), 1);
});

test('realtime is emitted only after a successful commit and transport failures cannot undo it', async () => {
    const data = await fixture();
    const assignmentEvents = [];
    const ticketEvents = [];
    services.tickets.assignmentRealtimePublisher.publish = (change) => assignmentEvents.push(change);
    services.tickets.realtimePublisher.publish = (event, ticket) => ticketEvents.push({ event, ticket });
    await assert.rejects(services.tickets.assignmentService.replace(
        data.actor._id, data.ticket.id, 99, [String(data.first._id)]
    ), (error) => error.code === 'VERSION_CONFLICT');
    assert.equal(assignmentEvents.length, 0);
    assert.equal(ticketEvents.length, 0);
    services.tickets.assignmentRealtimePublisher.publish = () => { throw new Error('transport failure'); };
    const result = await services.tickets.assignmentService.replace(
        data.actor._id, data.ticket.id, 1, [String(data.first._id)]
    );
    assert.equal(result.version, 2);
    const ticket = await Ticket.findById(data.ticket.id).lean();
    assert.equal(ticket.version, 2);
    assert.equal(ticket.activeAssigneeIds.length, 1);
});
