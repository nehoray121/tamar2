const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketAssignment = require('../src/modules/tickets/models/TicketAssignment.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const TicketTransfer = require('../src/modules/tickets/transfers/models/TicketTransfer.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
let counter = 0;
const addMembership = (user, role, graph) => services.membershipRepository.create({
    userId: user._id,
    role,
    scopeType: [ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(role) ? SCOPE_TYPES.ROOM : SCOPE_TYPES.SUB_ENVIRONMENT,
    scopeId: [ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(role) ? graph.room._id : graph.subEnvironment._id,
    systemId: graph.system._id,
    environmentId: graph.environment._id,
    subEnvironmentId: graph.subEnvironment._id,
    roomId: [ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(role) ? graph.room._id : undefined,
    isActive: true,
    assignedBy: user._id
});
const user = (name) => services.userRepository.create({ displayName: name, isActive: true });
const roomGraph = async (management, system, label) => {
    const environment = await management.createEnvironment({
        systemId: system._id, key: `p6-env-${label}-${counter}`, name: `Environment ${label}`
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id,
        key: `p6-sub-${label}-${counter}`, name: `Sub ${label}`
    });
    const room = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `p6-room-${label}-${counter}`, name: `Room ${label}`
    });
    return { system, environment, subEnvironment, room };
};
const fixture = async () => {
    counter += 1;
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `P6SYS${counter}`, name: 'Phase 6 System' });
    const [a, b, c] = await Promise.all([
        roomGraph(management, system, 'a'), roomGraph(management, system, 'b'), roomGraph(management, system, 'c')
    ]);
    const sourceManager = await user('Source Manager');
    const destinationManager = await user('Destination Manager');
    const destinationUser = await user('Destination User');
    const thirdManager = await user('Third Manager');
    const assignee = await user('Source Assignee');
    await Promise.all([
        addMembership(sourceManager, ROLES.ROOM_MANAGER, a),
        addMembership(destinationManager, ROLES.ROOM_MANAGER, b),
        addMembership(destinationUser, ROLES.ROOM_USER, b),
        addMembership(thirdManager, ROLES.ROOM_MANAGER, c),
        addMembership(assignee, ROLES.ROOM_USER, a)
    ]);
    const ticket = await services.tickets.ticketService.create(sourceManager._id, {
        roomId: String(a.room._id), subject: 'Transfer lifecycle',
        description: 'Sequential ownership test', priority: 'HIGH'
    });
    return { a, b, c, sourceManager, destinationManager, destinationUser, thirdManager, assignee, ticket };
};
const listQuery = (overrides = {}) => ({
    direction: 'INCOMING', page: 1, limit: 25, sortBy: 'initiatedAt', sortDirection: 'desc', ...overrides
});

before(async () => { await connectTestDatabase(); services = createServiceContainer({ logger }); });
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('initiation moves restricted ownership, preserves visibility, ends assignments and records history atomically', async () => {
    const data = await fixture();
    await services.tickets.assignmentService.replace(
        data.sourceManager._id, data.ticket.id, 1, [String(data.assignee._id)]
    );
    const result = await services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 2,
        { destinationRoomId: data.b.room._id, reason: 'Specialist room must continue handling' }
    );
    assert.equal(result.ticket.version, 3);
    assert.equal(result.ticket.currentRoomId, String(data.b.room._id));
    assert.equal(result.ticket.activeTransferId, result.transfer.id);
    assert.deepEqual(result.ticket.activeAssigneeIds, []);
    assert.equal(result.transfer.status, 'PENDING_ACCEPTANCE');
    assert.equal(result.transfer.sequence, 1);
    const stored = await Ticket.findById(data.ticket.id).lean();
    assert.deepEqual(new Set(stored.visibleRoomIds.map(String)), new Set([String(data.a.room._id), String(data.b.room._id)]));
    const assignment = await TicketAssignment.findOne({ ticketId: data.ticket.id }).lean();
    assert.equal(assignment.isActive, false);
    assert.equal(assignment.endedReason, 'TICKET_TRANSFERRED');
    assert.equal(String(assignment.endedBy), String(data.sourceManager._id));
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_TRANSFER_INITIATED' }), 1);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_ASSIGNEES_UPDATED' }), 2);
    const sourceView = await services.tickets.ticketService.get(data.sourceManager._id, data.ticket.id);
    assert.equal(sourceView.capabilities.canView, true);
    assert.equal(sourceView.capabilities.isReadOnly, true);
    assert.equal(sourceView.capabilities.readOnlyReason, 'TRANSFER_PENDING_ACCEPTANCE');
    const destinationView = await services.tickets.ticketService.get(data.destinationManager._id, data.ticket.id);
    assert.equal(destinationView.capabilities.canAcceptTransfer, true);
    assert.equal(destinationView.capabilities.canEdit, false);
    await assert.rejects(
        services.tickets.ticketService.close(data.destinationManager._id, data.ticket.id, 3, 'Cannot close yet'),
        (error) => error.code === 'TICKET_CLOSE_FORBIDDEN'
    );
    await assert.rejects(
        services.tickets.assignmentService.replace(data.destinationManager._id, data.ticket.id, 3, []),
        (error) => error.code === 'ASSIGNMENT_FORBIDDEN'
    );
});

test('destination manager accepts while destination ROOM_USER and sender cannot resolve the transfer', async () => {
    const data = await fixture();
    const initiated = await services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.b.room._id, reason: 'Destination must review and accept' }
    );
    await assert.rejects(
        services.tickets.transferService.accept(data.destinationUser._id, initiated.transfer.id, 2),
        (error) => error.code === 'TRANSFER_ACCEPT_FORBIDDEN'
    );
    await assert.rejects(
        services.tickets.transferService.cancel(data.sourceManager._id, initiated.transfer.id, 2, 'Sender recall is forbidden'),
        (error) => error.code === 'TRANSFER_NOT_FOUND'
    );
    const accepted = await services.tickets.transferService.accept(
        data.destinationManager._id, initiated.transfer.id, 2
    );
    assert.equal(accepted.transfer.status, 'ACCEPTED');
    assert.equal(accepted.transfer.externalState, 'PROCESSING');
    assert.equal(accepted.ticket.version, 3);
    assert.equal(accepted.ticket.activeTransferId, null);
    assert.equal(accepted.ticket.capabilities.canEdit, true);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_TRANSFER_ACCEPTED' }), 1);
    await assert.rejects(
        services.tickets.transferService.accept(data.destinationManager._id, initiated.transfer.id, 3),
        (error) => error.code === 'TRANSFER_NOT_PENDING'
    );
});

test('A to B to C chain is sequential and cancellation returns to immediate source B without reactivating assignments', async () => {
    const data = await fixture();
    const first = await services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.b.room._id, reason: 'First ownership handoff' }
    );
    await services.tickets.transferService.accept(data.destinationManager._id, first.transfer.id, 2);
    const second = await services.tickets.transferService.initiate(
        data.destinationManager._id, data.ticket.id, 3,
        { destinationRoomId: data.c.room._id, reason: 'Second ownership handoff' }
    );
    assert.equal(second.transfer.sequence, 2);
    const cancelled = await services.tickets.transferService.cancel(
        data.thirdManager._id, second.transfer.id, 4, 'Third room cannot continue handling'
    );
    assert.equal(cancelled.transfer.status, 'CANCELLED');
    assert.equal(cancelled.ticket.version, 5);
    assert.equal(cancelled.ticket.currentRoomId, String(data.b.room._id));
    assert.notEqual(cancelled.ticket.currentRoomId, String(data.a.room._id));
    assert.equal(cancelled.ticket.activeTransferId, null);
    assert.equal(await TicketAssignment.countDocuments({ isActive: true }), 0);
    const stored = await Ticket.findById(data.ticket.id).lean();
    assert.deepEqual(
        new Set(stored.visibleRoomIds.map(String)),
        new Set([String(data.a.room._id), String(data.b.room._id), String(data.c.room._id)])
    );
    const transfers = await TicketTransfer.find({ ticketId: data.ticket.id }).sort({ sequence: 1 }).lean();
    assert.deepEqual(transfers.map((item) => item.status), ['ACCEPTED', 'CANCELLED']);
});

test('transfer target discovery uses active same-System hierarchy and excludes the current room', async () => {
    const data = await fixture();
    const targets = await services.tickets.transferTargetService.list(data.sourceManager._id, data.ticket.id, {
        page: 1, limit: 25
    });
    assert.equal(targets.items.length, 2);
    assert.ok(targets.items.some((item) => item.id === String(data.b.room._id)));
    assert.ok(targets.items.some((item) => item.id === String(data.c.room._id)));
    assert.ok(targets.items.every((item) => item.id !== String(data.a.room._id)));
    assert.ok(targets.items.every((item) => item.environment?.id && item.subEnvironment?.id));
});

test('same-room, cross-System, duplicate pending and ROOM_USER initiation are rejected', async () => {
    const data = await fixture();
    await assert.rejects(services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.a.room._id, reason: 'Same room is invalid' }
    ), (error) => error.code === 'TRANSFER_TARGET_SAME_AS_SOURCE');
    await assert.rejects(services.tickets.transferService.initiate(
        data.assignee._id, data.ticket.id, 1,
        { destinationRoomId: data.b.room._id, reason: 'Room users cannot transfer' }
    ), (error) => error.code === 'TRANSFER_INITIATION_FORBIDDEN');
    const management = services.organization.managementService;
    const otherSystem = await management.createSystem({ key: `P6OTHER${counter}`, name: 'Other System' });
    const other = await roomGraph(management, otherSystem, 'other');
    await assert.rejects(services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: other.room._id, reason: 'Cross system is forbidden' }
    ), (error) => error.code === 'TRANSFER_CROSS_SYSTEM_FORBIDDEN');
    await services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.b.room._id, reason: 'Only one pending transfer' }
    );
    await assert.rejects(services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 2,
        { destinationRoomId: data.c.room._id, reason: 'Duplicate pending transfer' }
    ), (error) => ['TRANSFER_ALREADY_PENDING', 'TICKET_NOT_FOUND'].includes(error.code));
});

test('transfer list, detail and ticket history are scope-filtered and expose derived external state', async () => {
    const data = await fixture();
    const initiated = await services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.b.room._id, reason: 'Queryable transfer history' }
    );
    const incoming = await services.tickets.transferQueryService.list(
        data.destinationManager._id, listQuery({ direction: 'INCOMING' })
    );
    assert.equal(incoming.items.length, 1);
    assert.equal(incoming.items[0].transfer.externalState, 'PENDING');
    const outgoing = await services.tickets.transferQueryService.list(
        data.sourceManager._id, listQuery({ direction: 'OUTGOING', search: data.ticket.ticketNumber })
    );
    assert.equal(outgoing.items.length, 1);
    const detail = await services.tickets.transferQueryService.detail(
        data.destinationManager._id, initiated.transfer.id
    );
    assert.equal(detail.sourceRoom.id, String(data.a.room._id));
    assert.equal(detail.destinationRoom.id, String(data.b.room._id));
    const history = await services.tickets.transferQueryService.ticketHistory(
        data.sourceManager._id, data.ticket.id, { page: 1, limit: 50, sortDirection: 'asc' }
    );
    assert.equal(history.items.length, 1);
    assert.equal(history.items[0].sequence, 1);
});
