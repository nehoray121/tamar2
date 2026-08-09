const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const createApp = require('../src/app.js');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');
const { createTestConfig, createVerifier, initializeAuthKeys, signToken } = require('./helpers/authFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let config;
let services;
let server;
let baseUrl;
let counter = 0;
const requestJson = async (path, { token, method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...headers
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { response, body: await response.json() };
};
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
const createIdentity = async (name, role, graph) => {
    counter += 1;
    const subject = `phase5-http-${counter}`;
    const personalNumber = `7${String(counter).padStart(6, '0')}`;
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    const user = await services.userRepository.create({
        externalIdentity: { provider: config.auth.providerKey, subject },
        personalNumberLookupHash: protectedNumber.lookupHash,
        personalNumberLast4: protectedNumber.last4,
        displayName: name,
        email: `${subject}@example.test`,
        isActive: true
    });
    await addMembership(user, role, graph);
    const token = await signToken({ subject, personalNumber, displayName: name });
    return { user, token };
};
const createFixture = async (actorRole = ROLES.ROOM_MANAGER) => {
    const suffix = String(++counter);
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `p5-http-system-${suffix}`, name: 'System' });
    const environment = await management.createEnvironment({ systemId: system._id, key: `p5-http-env-${suffix}`, name: 'Environment' });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id, key: `p5-http-sub-${suffix}`, name: 'SubEnvironment'
    });
    const room = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `p5-http-room-${suffix}`, name: 'Room'
    });
    const graph = { system, environment, subEnvironment, room };
    const actor = await createIdentity('Assignment Manager', actorRole, graph);
    const target = await createIdentity('Eligible Room User', ROLES.ROOM_USER, graph);
    const create = await requestJson('/api/tickets', {
        token: actor.token,
        method: 'POST',
        body: { roomId: String(room._id), subject: 'Assignment HTTP ticket', description: 'HTTP assignment flow', priority: 'MEDIUM' }
    });
    return { graph, actor, target, ticket: create.body.data };
};

before(async () => {
    await initializeAuthKeys();
    await connectTestDatabase();
    config = createTestConfig();
    services = createServiceContainer({ config, logger });
    services.auth.accessTokenVerifier = createVerifier(config.auth);
    server = createApp({ config, logger, services }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(clearTestCollections);
after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await dropAndDisconnectTestDatabase();
});

test('all four assignment endpoints require an authenticated active membership', async () => {
    for (const [method, path, body] of [
        ['PUT', '/api/tickets/507f1f77bcf86cd799439011/assignees', { assigneeIds: [] }],
        ['GET', '/api/tickets/507f1f77bcf86cd799439011/assignable-users'],
        ['GET', '/api/tickets/507f1f77bcf86cd799439011/assignments'],
        ['POST', '/api/tickets/bulk/assignees', { operation: 'REPLACE', tickets: [], assigneeIds: [] }]
    ]) {
        const result = await requestJson(path, { method, body });
        assert.equal(result.response.status, 401);
        assert.equal(result.body.error.code, 'AUTHENTICATION_REQUIRED');
    }
});

test('PUT assignees requires If-Match, rejects protected fields and returns ETag with safe summaries', async () => {
    const data = await createFixture();
    const path = `/api/tickets/${data.ticket.id}/assignees`;
    const missing = await requestJson(path, { token: data.actor.token, method: 'PUT', body: { assigneeIds: [] } });
    const protectedField = await requestJson(path, {
        token: data.actor.token, method: 'PUT', headers: { 'If-Match': '1' },
        body: { assigneeIds: [String(data.target.user._id)], roomId: String(data.graph.room._id) }
    });
    const result = await requestJson(path, {
        token: data.actor.token, method: 'PUT', headers: { 'If-Match': '"1"' },
        body: { assigneeIds: [String(data.target.user._id), String(data.target.user._id)] }
    });
    assert.equal(missing.response.status, 428);
    assert.equal(protectedField.body.error.code, 'VALIDATION_ERROR');
    assert.equal(result.response.status, 200);
    assert.equal(result.response.headers.get('etag'), '"2"');
    assert.deepEqual(result.body.data.activeAssigneeIds, [String(data.target.user._id)]);
    assert.equal(result.body.data.activeAssignees[0].displayName, 'Eligible Room User');
    assert.doesNotMatch(JSON.stringify(result.body), /personalNumber|externalIdentity|accessToken/i);
});

test('assignable-users supports strict query, search, pagination and assigned filtering', async () => {
    const data = await createFixture();
    await requestJson(`/api/tickets/${data.ticket.id}/assignees`, {
        token: data.actor.token, method: 'PUT', headers: { 'If-Match': '1' },
        body: { assigneeIds: [String(data.target.user._id)] }
    });
    const found = await requestJson(`/api/tickets/${data.ticket.id}/assignable-users?search=Eligible&page=1&limit=10`, { token: data.actor.token });
    const excluded = await requestJson(`/api/tickets/${data.ticket.id}/assignable-users?includeAssigned=false`, { token: data.actor.token });
    const unknown = await requestJson(`/api/tickets/${data.ticket.id}/assignable-users?roomId=${data.graph.room._id}`, { token: data.actor.token });
    assert.equal(found.body.data.items.length, 1);
    assert.equal(found.body.data.items[0].isCurrentlyAssigned, true);
    assert.ok(excluded.body.data.items.every((item) => item.id !== String(data.target.user._id)));
    assert.equal(unknown.body.error.code, 'VALIDATION_ERROR');
});

test('assignment history endpoint filters ACTIVE and HISTORY without exposing identity protection', async () => {
    const data = await createFixture();
    await requestJson(`/api/tickets/${data.ticket.id}/assignees`, {
        token: data.actor.token, method: 'PUT', headers: { 'If-Match': '1' },
        body: { assigneeIds: [String(data.target.user._id)] }
    });
    await requestJson(`/api/tickets/${data.ticket.id}/assignees`, {
        token: data.actor.token, method: 'PUT', headers: { 'If-Match': '2' }, body: { assigneeIds: [] }
    });
    const result = await requestJson(`/api/tickets/${data.ticket.id}/assignments?view=HISTORY&sortDirection=desc`, { token: data.actor.token });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.items.length, 1);
    assert.equal(result.body.data.items[0].endedReason, 'REPLACED_ASSIGNMENT_SET');
    assert.doesNotMatch(JSON.stringify(result.body), /personalNumber|externalIdentity|provider|subject/i);
});

test('ROOM_USER mutation is forbidden and assignable-user discovery is anti-enumerated', async () => {
    const data = await createFixture(ROLES.ROOM_USER);
    const replace = await requestJson(`/api/tickets/${data.ticket.id}/assignees`, {
        token: data.actor.token, method: 'PUT', headers: { 'If-Match': '1' }, body: { assigneeIds: [] }
    });
    const discovery = await requestJson(`/api/tickets/${data.ticket.id}/assignable-users`, { token: data.actor.token });
    assert.equal(replace.response.status, 403);
    assert.equal(replace.body.error.code, 'ASSIGNMENT_FORBIDDEN');
    assert.equal(discovery.response.status, 404);
    assert.equal(discovery.body.error.code, 'TICKET_NOT_FOUND');
});

test('bulk validation rejects duplicate tickets, empty ADD and oversized or unknown input', async () => {
    const data = await createFixture();
    const ticketRef = { ticketId: data.ticket.id, expectedVersion: 1 };
    for (const body of [
        { operation: 'ADD', tickets: [ticketRef], assigneeIds: [] },
        { operation: 'ADD', tickets: [ticketRef, ticketRef], assigneeIds: [String(data.target.user._id)] },
        { operation: 'UPGRADE', tickets: [ticketRef], assigneeIds: [String(data.target.user._id)] },
        { operation: 'ADD', tickets: [ticketRef], assigneeIds: [String(data.target.user._id)], role: 'ROOM_MANAGER' }
    ]) {
        const result = await requestJson('/api/tickets/bulk/assignees', { token: data.actor.token, method: 'POST', body });
        assert.equal(result.response.status, 400);
    }
});

test('bulk ADD commits all ticket results and stale bulk request rolls back atomically', async () => {
    const data = await createFixture();
    const second = await requestJson('/api/tickets', {
        token: data.actor.token, method: 'POST',
        body: { roomId: String(data.graph.room._id), subject: 'Second HTTP ticket', description: 'Bulk assignment', priority: 'LOW' }
    });
    const tickets = [data.ticket, second.body.data].map((ticket) => ({ ticketId: ticket.id, expectedVersion: 1 }));
    const added = await requestJson('/api/tickets/bulk/assignees', {
        token: data.actor.token, method: 'POST',
        body: { operation: 'ADD', tickets, assigneeIds: [String(data.target.user._id)] }
    });
    assert.equal(added.response.status, 200);
    assert.equal(added.body.data.results.length, 2);
    assert.ok(added.body.data.results.every((item) => item.version === 2));
    const stale = await requestJson('/api/tickets/bulk/assignees', {
        token: data.actor.token, method: 'POST',
        body: { operation: 'REMOVE', tickets: added.body.data.results.map((item, index) => ({
            ticketId: item.ticketId, expectedVersion: index === 0 ? 2 : 99
        })), assigneeIds: [String(data.target.user._id)] }
    });
    assert.equal(stale.response.status, 409);
    assert.equal(stale.body.error.code, 'VERSION_CONFLICT');
    const detail = await requestJson(`/api/tickets/${data.ticket.id}`, { token: data.actor.token });
    assert.equal(detail.body.data.activeAssigneeIds.length, 1);
});

test('Phase 5 mounts no transfer, assign-me or client-controlled role endpoint', async () => {
    const data = await createFixture();
    for (const path of [
        `/api/tickets/${data.ticket.id}/assign-me`,
        `/api/tickets/${data.ticket.id}/transfer`,
        '/api/tickets/bulk/transfer'
    ]) {
        const result = await requestJson(path, { token: data.actor.token, method: 'POST', body: {} });
        assert.equal(result.response.status, 404);
    }
});
