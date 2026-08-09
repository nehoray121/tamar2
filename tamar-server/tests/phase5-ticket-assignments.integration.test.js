const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketAssignment = require('../src/modules/tickets/models/TicketAssignment.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
let counter = 0;
const createUser = (name, overrides = {}) => services.userRepository.create({
    displayName: name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.test`, isActive: true, ...overrides
});
const createHierarchy = async (suffix = String(++counter)) => {
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `a-system-${suffix}`, name: `System ${suffix}` });
    const environment = await management.createEnvironment({ systemId: system._id, key: `a-env-${suffix}`, name: 'Environment' });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id, key: `a-sub-${suffix}`, name: 'SubEnvironment'
    });
    const room = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `a-room-${suffix}`, name: 'Room'
    });
    return { system, environment, subEnvironment, room };
};
const addMembership = (user, role, graph) => {
    const roomRole = [ROLES.ROOM_MANAGER, ROLES.ROOM_USER].includes(role);
    const subRole = role === ROLES.SYSTEM_ADMIN;
    return services.membershipRepository.create({
        userId: user._id,
        role,
        scopeType: roomRole ? SCOPE_TYPES.ROOM : (subRole ? SCOPE_TYPES.SUB_ENVIRONMENT : SCOPE_TYPES.SYSTEM),
        scopeId: roomRole ? graph.room._id : (subRole ? graph.subEnvironment._id : graph.system._id),
        systemId: graph.system._id,
        environmentId: roomRole || subRole ? graph.environment._id : undefined,
        subEnvironmentId: roomRole || subRole ? graph.subEnvironment._id : undefined,
        roomId: roomRole ? graph.room._id : undefined,
        isActive: true,
        assignedBy: user._id
    });
};
const createTicket = (actor, graph, subject = 'Assignment ticket') => services.tickets.ticketService.create(actor._id, {
    roomId: String(graph.room._id), subject, description: 'Assignment integration coverage', priority: 'MEDIUM', fieldValues: {}
});
const fixture = async (actorRole = ROLES.ROOM_MANAGER) => {
    const graph = await createHierarchy();
    const actor = await createUser(`Actor ${counter}`);
    const target = await createUser(`Target ${counter}`);
    await addMembership(actor, actorRole, graph);
    await addMembership(target, ROLES.ROOM_USER, graph);
    const ticket = await createTicket(actor, graph);
    return { graph, actor, target, ticket };
};

before(async () => {
    await connectTestDatabase();
    services = createServiceContainer({ logger });
});
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('TicketAssignment exposes the required active uniqueness and history indexes', () => {
    const indexes = TicketAssignment.schema.indexes();
    assert.ok(indexes.some(([keys, options]) => keys.ticketId === 1 && keys.userId === 1
        && options.unique && options.partialFilterExpression?.isActive === true));
    for (const name of ['assignment_ticket_active_chronology', 'assignment_user_active_chronology',
        'assignment_room_active_chronology', 'assignment_ticket_history', 'assignment_actor_chronology']) {
        assert.ok(indexes.some(([, options]) => options.name === name));
    }
});

test('creator is not automatically assigned and managers expose canAssign', async () => {
    const data = await fixture();
    assert.deepEqual(data.ticket.activeAssigneeIds, []);
    assert.deepEqual(data.ticket.activeAssignees, []);
    assert.equal(data.ticket.capabilities.canAssign, true);
    assert.equal(await TicketAssignment.countDocuments({}), 0);
});

test('ROOM_USER can never assign while manager, SYSTEM_ADMIN and SUPER_ADMIN can in exact scope', async () => {
    for (const role of [ROLES.ROOM_MANAGER, ROLES.SYSTEM_ADMIN, ROLES.SUPER_ADMIN]) {
        const data = await fixture(role);
        const result = await services.tickets.assignmentService.replace(
            data.actor._id, data.ticket.id, 1, [String(data.target._id)]
        );
        assert.equal(result.capabilities.canAssign, true);
    }
    const data = await fixture(ROLES.ROOM_USER);
    await assert.rejects(
        services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]),
        (error) => error.code === 'ASSIGNMENT_FORBIDDEN'
    );
});

test('single replacement normalizes, deduplicates and sorts IDs with one version and history increment', async () => {
    const data = await fixture();
    const second = await createUser('Second target');
    await addMembership(second, ROLES.ROOM_MANAGER, data.graph);
    const ids = [String(second._id), String(data.target._id), String(second._id)];
    const result = await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, ids);
    assert.equal(result.version, 2);
    assert.deepEqual(result.activeAssigneeIds, [...new Set(ids)].sort((a, b) => a.localeCompare(b)));
    assert.equal(result.activeAssignees.length, 2);
    assert.equal(await TicketAssignment.countDocuments({ isActive: true }), 2);
    const history = await TicketHistory.findOne({ eventType: 'TICKET_ASSIGNEES_UPDATED' }).lean();
    assert.equal(history.versionBefore, 1);
    assert.equal(history.versionAfter, 2);
    assert.equal(history.metadata.addedCount, 2);
    assert.deepEqual(history.changedFields, ['activeAssigneeIds']);
});

test('same effective assignment set is rejected without version, history or assignment changes', async () => {
    const data = await fixture();
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]);
    await assert.rejects(
        services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 2, [String(data.target._id), String(data.target._id)]),
        (error) => error.code === 'EMPTY_ASSIGNMENT_CHANGE'
    );
    assert.equal((await Ticket.findById(data.ticket.id).lean()).version, 2);
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_ASSIGNEES_UPDATED' }), 1);
});

test('removal ends the old record and reassignment creates a new chronological record', async () => {
    const data = await fixture();
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]);
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 2, []);
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 3, [String(data.target._id)]);
    const records = await TicketAssignment.find({ ticketId: data.ticket.id }).sort({ assignedAt: 1, _id: 1 }).lean();
    assert.equal(records.length, 2);
    assert.equal(records[0].isActive, false);
    assert.equal(records[0].endedReason, 'REPLACED_ASSIGNMENT_SET');
    assert.equal(records[1].isActive, true);
    assert.notEqual(String(records[0]._id), String(records[1]._id));
});

test('inactive, missing, cross-room and administrator-only targets are rejected', async () => {
    const data = await fixture();
    const inactive = await createUser('Inactive target', { isActive: false });
    await addMembership(inactive, ROLES.ROOM_USER, data.graph);
    const otherGraph = await createHierarchy();
    const outside = await createUser('Outside target');
    await addMembership(outside, ROLES.ROOM_USER, otherGraph);
    const adminOnly = await createUser('Admin only');
    await addMembership(adminOnly, ROLES.SYSTEM_ADMIN, data.graph);
    const cases = [
        ['507f1f77bcf86cd799439011', 'ASSIGNMENT_TARGET_NOT_FOUND'],
        [String(inactive._id), 'ASSIGNMENT_TARGET_INACTIVE'],
        [String(outside._id), 'ASSIGNMENT_TARGET_NOT_IN_ROOM'],
        [String(adminOnly._id), 'ASSIGNMENT_TARGET_NOT_IN_ROOM']
    ];
    for (const [targetId, code] of cases) {
        await assert.rejects(
            services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [targetId]),
            (error) => error.code === code
        );
    }
});

test('an administrator is assignable only with an additional direct eligible Room membership', async () => {
    const data = await fixture();
    const admin = await createUser('Dual role admin');
    await addMembership(admin, ROLES.SYSTEM_ADMIN, data.graph);
    await addMembership(admin, ROLES.ROOM_USER, data.graph);
    const result = await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(admin._id)]);
    assert.deepEqual(result.activeAssigneeIds, [String(admin._id)]);
});

test('stale and closed tickets reject assignment mutation and closure preserves active assignments', async () => {
    const data = await fixture();
    await assert.rejects(
        services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 9, [String(data.target._id)]),
        (error) => error.code === 'VERSION_CONFLICT'
    );
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]);
    await services.tickets.ticketService.close(data.actor._id, data.ticket.id, 2, 'Completed');
    await assert.rejects(
        services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 3, []),
        (error) => error.code === 'ASSIGNMENT_TICKET_CLOSED'
    );
    assert.equal(await TicketAssignment.countDocuments({ isActive: true }), 1);
});

test('assignable-users is paginated, searchable, direct-room-only and marks current assignments', async () => {
    const data = await fixture();
    const managerTarget = await createUser('Alpha Manager');
    await addMembership(managerTarget, ROLES.ROOM_MANAGER, data.graph);
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]);
    const result = await services.tickets.assignmentService.assignableUsers(data.actor._id, data.ticket.id, {
        page: 1, limit: 25, search: 'Target', includeAssigned: true
    });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].eligibleRoomRole, 'ROOM_USER');
    assert.equal(result.items[0].isCurrentlyAssigned, true);
    const excluded = await services.tickets.assignmentService.assignableUsers(data.actor._id, data.ticket.id, {
        page: 1, limit: 25, search: undefined, includeAssigned: false
    });
    assert.ok(excluded.items.every((item) => item.id !== String(data.target._id)));
    assert.ok(excluded.items.some((item) => item.id === String(managerTarget._id)));
});

test('assignment history supports ACTIVE, HISTORY and ALL with safe user summaries', async () => {
    const data = await fixture();
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]);
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 2, []);
    const all = await services.tickets.assignmentService.assignments(data.actor._id, data.ticket.id, {
        view: 'ALL', page: 1, limit: 50, sortDirection: 'asc'
    });
    const active = await services.tickets.assignmentService.assignments(data.actor._id, data.ticket.id, {
        view: 'ACTIVE', page: 1, limit: 50, sortDirection: 'asc'
    });
    const history = await services.tickets.assignmentService.assignments(data.actor._id, data.ticket.id, {
        view: 'HISTORY', page: 1, limit: 50, sortDirection: 'asc'
    });
    assert.equal(all.items.length, 1);
    assert.equal(active.items.length, 0);
    assert.equal(history.items.length, 1);
    assert.equal(history.items[0].user.displayName, data.target.displayName);
    assert.doesNotMatch(JSON.stringify(history), /personalNumber|externalIdentity|membership/i);
});

test('bulk ADD, REMOVE and REPLACE are atomic and increment each changed ticket once', async () => {
    const data = await fixture();
    const secondTicket = await createTicket(data.actor, data.graph, 'Second bulk ticket');
    const inputTickets = [data.ticket, secondTicket].map((ticket) => ({ ticketId: ticket.id, expectedVersion: 1 }));
    const added = await services.tickets.assignmentService.bulk(data.actor._id, {
        operation: 'ADD', tickets: inputTickets, assigneeIds: [String(data.target._id)]
    });
    assert.equal(added.results.length, 2);
    assert.ok(added.results.every((item) => item.version === 2 && item.activeAssigneeCount === 1));
    const removed = await services.tickets.assignmentService.bulk(data.actor._id, {
        operation: 'REMOVE', tickets: added.results.map((item) => ({ ticketId: item.ticketId, expectedVersion: item.version })),
        assigneeIds: [String(data.target._id)]
    });
    assert.ok(removed.results.every((item) => item.version === 3 && item.activeAssigneeCount === 0));
    const replaced = await services.tickets.assignmentService.bulk(data.actor._id, {
        operation: 'REPLACE', tickets: removed.results.map((item) => ({ ticketId: item.ticketId, expectedVersion: item.version })),
        assigneeIds: []
    }).catch((error) => error);
    assert.equal(replaced.code, 'EMPTY_ASSIGNMENT_CHANGE');
    assert.equal(await TicketHistory.countDocuments({ eventType: 'TICKET_ASSIGNEES_UPDATED' }), 4);
});

test('bulk rejects mixed rooms and rolls back all tickets on a stale version', async () => {
    const data = await fixture();
    const otherGraph = await createHierarchy();
    await addMembership(data.actor, ROLES.ROOM_MANAGER, otherGraph);
    await addMembership(data.target, ROLES.ROOM_USER, otherGraph);
    const otherTicket = await createTicket(data.actor, otherGraph, 'Other room');
    await assert.rejects(services.tickets.assignmentService.bulk(data.actor._id, {
        operation: 'ADD',
        tickets: [{ ticketId: data.ticket.id, expectedVersion: 1 }, { ticketId: otherTicket.id, expectedVersion: 1 }],
        assigneeIds: [String(data.target._id)]
    }), (error) => error.code === 'BULK_ASSIGNMENT_MIXED_ROOMS');
    const secondTicket = await createTicket(data.actor, data.graph, 'Same room');
    await assert.rejects(services.tickets.assignmentService.bulk(data.actor._id, {
        operation: 'ADD',
        tickets: [{ ticketId: data.ticket.id, expectedVersion: 1 }, { ticketId: secondTicket.id, expectedVersion: 99 }],
        assigneeIds: [String(data.target._id)]
    }), (error) => error.code === 'VERSION_CONFLICT');
    assert.equal(await TicketAssignment.countDocuments({}), 0);
    assert.equal(await Ticket.countDocuments({ version: { $ne: 1 } }), 0);
});

test('My Tasks includes active assignees, creator remains included, and removal updates the view', async () => {
    const data = await fixture();
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]);
    const query = { view: 'MY_TASKS', page: 1, limit: 25, sortBy: 'updatedAt', sortDirection: 'desc' };
    assert.equal((await services.tickets.ticketService.list(data.target._id, query)).items.length, 1);
    assert.equal((await services.tickets.ticketService.list(data.actor._id, query)).items.length, 1);
    await services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 2, []);
    assert.equal((await services.tickets.ticketService.list(data.target._id, query)).items.length, 0);
});

test('revoked target membership makes the target ineligible without deleting assignment history', async () => {
    const data = await fixture();
    await OrganizationMembership.updateOne({ userId: data.target._id }, {
        $set: { isActive: false, revokedAt: new Date(), revokedBy: data.actor._id }
    });
    await assert.rejects(
        services.tickets.assignmentService.replace(data.actor._id, data.ticket.id, 1, [String(data.target._id)]),
        (error) => error.code === 'ASSIGNMENT_TARGET_NOT_IN_ROOM'
    );
});
