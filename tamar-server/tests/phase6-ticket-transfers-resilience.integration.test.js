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
    userId: user._id, role, scopeType: SCOPE_TYPES.ROOM, scopeId: graph.room._id,
    systemId: graph.system._id, environmentId: graph.environment._id,
    subEnvironmentId: graph.subEnvironment._id, roomId: graph.room._id,
    isActive: true, assignedBy: user._id
});
const fixture = async () => {
    counter += 1;
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `P6RES${counter}`, name: 'Resilience System' });
    const environment = await management.createEnvironment({
        systemId: system._id, key: `p6-res-env-${counter}`, name: 'Environment'
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id,
        key: `p6-res-sub-${counter}`, name: 'SubEnvironment'
    });
    const sourceRoom = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `p6-res-source-${counter}`, name: 'Source'
    });
    const destinationRoom = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `p6-res-destination-${counter}`, name: 'Destination'
    });
    const source = { system, environment, subEnvironment, room: sourceRoom };
    const destination = { system, environment, subEnvironment, room: destinationRoom };
    const sourceManager = await services.userRepository.create({ displayName: 'Source Manager', isActive: true });
    const destinationManager = await services.userRepository.create({ displayName: 'Destination Manager', isActive: true });
    const assignee = await services.userRepository.create({ displayName: 'Assignee', isActive: true });
    await Promise.all([
        addMembership(sourceManager, ROLES.ROOM_MANAGER, source),
        addMembership(destinationManager, ROLES.ROOM_MANAGER, destination),
        addMembership(assignee, ROLES.ROOM_USER, source)
    ]);
    const ticket = await services.tickets.ticketService.create(sourceManager._id, {
        roomId: String(sourceRoom._id), subject: 'Transfer resilience',
        description: 'Atomic transfer coverage', priority: 'MEDIUM'
    });
    return { source, destination, sourceManager, destinationManager, assignee, ticket };
};

before(async () => { await connectTestDatabase(); services = createServiceContainer({ logger }); });
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('TicketHistory failure rolls back Transfer, ownership, assignments and version', async () => {
    const data = await fixture();
    await services.tickets.assignmentService.replace(
        data.sourceManager._id, data.ticket.id, 1, [String(data.assignee._id)]
    );
    const original = services.tickets.ticketHistoryRepository.append.bind(services.tickets.ticketHistoryRepository);
    services.tickets.ticketHistoryRepository.append = async () => { throw new Error('forced transfer history failure'); };
    try {
        await assert.rejects(services.tickets.transferService.initiate(
            data.sourceManager._id, data.ticket.id, 2,
            { destinationRoomId: data.destination.room._id, reason: 'This transaction must roll back' }
        ));
    } finally {
        services.tickets.ticketHistoryRepository.append = original;
    }
    const ticket = await Ticket.findById(data.ticket.id).lean();
    assert.equal(ticket.version, 2);
    assert.equal(String(ticket.currentRoomId), String(data.source.room._id));
    assert.equal(ticket.activeTransferId, null);
    assert.deepEqual(ticket.activeAssigneeIds.map(String), [String(data.assignee._id)]);
    assert.equal(await TicketTransfer.countDocuments({}), 0);
    assert.equal(await TicketAssignment.countDocuments({ isActive: true }), 1);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_TRANSFER_INITIATED' }), 0);
});

test('two concurrent initiations with one expected version produce one pending Transfer only', async () => {
    const data = await fixture();
    const settled = await Promise.allSettled([
        services.tickets.transferService.initiate(
            data.sourceManager._id, data.ticket.id, 1,
            { destinationRoomId: data.destination.room._id, reason: 'Concurrent transfer first writer' }
        ),
        services.tickets.transferService.initiate(
            data.sourceManager._id, data.ticket.id, 1,
            { destinationRoomId: data.destination.room._id, reason: 'Concurrent transfer second writer' }
        )
    ]);
    assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(settled.filter((item) => item.status === 'rejected').length, 1);
    const rejected = settled.find((item) => item.status === 'rejected').reason;
    assert.ok(['VERSION_CONFLICT', 'TRANSFER_ALREADY_PENDING', 'TRANSFER_SEQUENCE_CONFLICT'].includes(rejected.code));
    const ticket = await Ticket.findById(data.ticket.id).lean();
    assert.equal(ticket.version, 2);
    assert.ok(ticket.activeTransferId);
    assert.equal(await TicketTransfer.countDocuments({ status: 'PENDING_ACCEPTANCE' }), 1);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_TRANSFER_INITIATED' }), 1);
});

test('realtime emits only after commit and transport failure cannot undo committed state', async () => {
    const data = await fixture();
    const events = [];
    const original = services.tickets.transferRealtimePublisher.publish.bind(
        services.tickets.transferRealtimePublisher
    );
    services.tickets.transferRealtimePublisher.publish = (...args) => events.push(args);
    await assert.rejects(services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 99,
        { destinationRoomId: data.destination.room._id, reason: 'Stale transfer emits nothing' }
    ), (error) => error.code === 'VERSION_CONFLICT');
    assert.equal(events.length, 0);
    services.tickets.transferRealtimePublisher.publish = () => { throw new Error('transport failure'); };
    try {
        await assert.rejects(services.tickets.transferService.initiate(
            data.sourceManager._id, data.ticket.id, 1,
            { destinationRoomId: data.destination.room._id, reason: 'Committed before transport failure' }
        ), /transport failure/);
    } finally {
        services.tickets.transferRealtimePublisher.publish = original;
    }
    const ticket = await Ticket.findById(data.ticket.id).lean();
    assert.equal(ticket.version, 2);
    assert.equal(String(ticket.currentRoomId), String(data.destination.room._id));
    assert.equal(await TicketTransfer.countDocuments({ status: 'PENDING_ACCEPTANCE' }), 1);
});

test('acceptance history failure rolls back both Ticket and Transfer resolution', async () => {
    const data = await fixture();
    const initiated = await services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.destination.room._id, reason: 'Acceptance rollback setup' }
    );
    const original = services.tickets.ticketHistoryRepository.append.bind(services.tickets.ticketHistoryRepository);
    services.tickets.ticketHistoryRepository.append = async () => { throw new Error('forced acceptance history failure'); };
    try {
        await assert.rejects(services.tickets.transferService.accept(
            data.destinationManager._id, initiated.transfer.id, 2
        ));
    } finally {
        services.tickets.ticketHistoryRepository.append = original;
    }
    const [ticket, transfer] = await Promise.all([
        Ticket.findById(data.ticket.id).lean(), TicketTransfer.findById(initiated.transfer.id).lean()
    ]);
    assert.equal(ticket.version, 2);
    assert.equal(String(ticket.activeTransferId), initiated.transfer.id);
    assert.equal(transfer.status, 'PENDING_ACCEPTANCE');
    assert.equal(transfer.acceptedBy, null);
});

test('concurrent accept and cancel resolve a pending Transfer exactly once', async () => {
    const data = await fixture();
    const initiated = await services.tickets.transferService.initiate(
        data.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.destination.room._id, reason: 'Concurrent resolution setup' }
    );

    const settled = await Promise.allSettled([
        services.tickets.transferService.accept(
            data.destinationManager._id, initiated.transfer.id, 2
        ),
        services.tickets.transferService.cancel(
            data.destinationManager._id, initiated.transfer.id, 2,
            { reason: 'Concurrent cancellation must lose or win atomically' }
        )
    ]);

    assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(settled.filter((item) => item.status === 'rejected').length, 1);
    const [ticket, transfer] = await Promise.all([
        Ticket.findById(data.ticket.id).lean(),
        TicketTransfer.findById(initiated.transfer.id).lean()
    ]);
    assert.equal(ticket.version, 3);
    assert.equal(ticket.activeTransferId, null);
    assert.ok(['ACCEPTED', 'CANCELLED'].includes(transfer.status));
    assert.equal(await TicketHistory.countDocuments({
        eventType: { $in: ['TICKET_TRANSFER_ACCEPTED', 'TICKET_TRANSFER_CANCELLED'] }
    }), 1);
});