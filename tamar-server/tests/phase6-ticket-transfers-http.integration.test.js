const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const createApp = require('../src/app.js');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const {
    createTestConfig, createVerifier, initializeAuthKeys, signToken
} = require('./helpers/authFixture.js');

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
    userId: user._id, role, scopeType: SCOPE_TYPES.ROOM, scopeId: graph.room._id,
    systemId: graph.system._id, environmentId: graph.environment._id,
    subEnvironmentId: graph.subEnvironment._id, roomId: graph.room._id,
    isActive: true, assignedBy: user._id
});
const createIdentity = async (name, role, graph) => {
    counter += 1;
    const subject = `phase6-http-${counter}`;
    const personalNumber = `8${String(counter).padStart(6, '0')}`;
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
    return { user, token: await signToken({ subject, personalNumber, displayName: name }) };
};
const fixture = async () => {
    counter += 1;
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `P6HTTP${counter}`, name: 'HTTP System' });
    const environment = await management.createEnvironment({
        systemId: system._id, key: `p6-http-env-${counter}`, name: 'Environment'
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id,
        key: `p6-http-sub-${counter}`, name: 'SubEnvironment'
    });
    const sourceRoom = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `p6-http-source-${counter}`, name: 'Source Room'
    });
    const destinationRoom = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `p6-http-destination-${counter}`, name: 'Destination Room'
    });
    const sourceGraph = { system, environment, subEnvironment, room: sourceRoom };
    const destinationGraph = { system, environment, subEnvironment, room: destinationRoom };
    const source = await createIdentity('HTTP Source Manager', ROLES.ROOM_MANAGER, sourceGraph);
    const destination = await createIdentity('HTTP Destination Manager', ROLES.ROOM_MANAGER, destinationGraph);
    const created = await requestJson('/api/tickets', {
        token: source.token,
        method: 'POST',
        body: {
            roomId: String(sourceRoom._id), subject: 'HTTP transfer ticket',
            description: 'Transfer endpoint coverage', priority: 'MEDIUM'
        }
    });
    return { sourceGraph, destinationGraph, source, destination, ticket: created.body.data };
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

test('all seven Phase 6 endpoints require an authenticated active membership', async () => {
    const id = '507f1f77bcf86cd799439011';
    for (const [method, path, body] of [
        ['POST', `/api/tickets/${id}/transfers`, { destinationRoomId: id, reason: 'Valid reason' }],
        ['GET', `/api/tickets/${id}/transfers`],
        ['GET', `/api/tickets/${id}/transfer-targets`],
        ['GET', '/api/ticket-transfers'],
        ['GET', `/api/ticket-transfers/${id}`],
        ['POST', `/api/ticket-transfers/${id}/accept`, {}],
        ['POST', `/api/ticket-transfers/${id}/cancel`, { reason: 'Valid reason' }]
    ]) {
        const result = await requestJson(path, { method, body });
        assert.equal(result.response.status, 401, `${method} ${path}`);
        assert.equal(result.body.error.code, 'AUTHENTICATION_REQUIRED');
    }
});

test('initiation requires If-Match, strict input and returns pending Transfer with ETag', async () => {
    const data = await fixture();
    const path = `/api/tickets/${data.ticket.id}/transfers`;
    const input = { destinationRoomId: String(data.destinationGraph.room._id), reason: 'HTTP handoff reason' };
    const missing = await requestJson(path, { token: data.source.token, method: 'POST', body: input });
    assert.equal(missing.response.status, 428);
    const protectedField = await requestJson(path, {
        token: data.source.token, method: 'POST', headers: { 'If-Match': '1' },
        body: { ...input, status: 'ACCEPTED' }
    });
    assert.equal(protectedField.response.status, 400);
    const created = await requestJson(path, {
        token: data.source.token, method: 'POST', headers: { 'If-Match': '"1"' }, body: input
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.response.headers.get('etag'), '"2"');
    assert.equal(created.body.data.transfer.status, 'PENDING_ACCEPTANCE');
    assert.equal(created.body.data.transfer.externalState, 'PENDING');
    assert.equal(created.body.data.ticket.currentRoomId, String(data.destinationGraph.room._id));
    assert.equal(created.body.data.ticket.capabilities.canEdit, false);
    assert.equal(created.response.headers.get('cache-control'), 'no-store');
});

test('targets, incoming/outgoing lists, detail and Ticket transfer history use real persisted data', async () => {
    const data = await fixture();
    const targets = await requestJson(`/api/tickets/${data.ticket.id}/transfer-targets`, { token: data.source.token });
    assert.equal(targets.response.status, 200);
    assert.equal(targets.body.data.items.length, 1);
    assert.equal(targets.body.data.items[0].id, String(data.destinationGraph.room._id));
    const initiated = await requestJson(`/api/tickets/${data.ticket.id}/transfers`, {
        token: data.source.token, method: 'POST', headers: { 'If-Match': '1' },
        body: { destinationRoomId: String(data.destinationGraph.room._id), reason: 'HTTP query coverage' }
    });
    const transferId = initiated.body.data.transfer.id;
    const incoming = await requestJson('/api/ticket-transfers?direction=INCOMING', { token: data.destination.token });
    const outgoing = await requestJson('/api/ticket-transfers?direction=OUTGOING', { token: data.source.token });
    const detail = await requestJson(`/api/ticket-transfers/${transferId}`, { token: data.destination.token });
    const history = await requestJson(`/api/tickets/${data.ticket.id}/transfers`, { token: data.source.token });
    assert.equal(incoming.body.data.items.length, 1);
    assert.equal(outgoing.body.data.items.length, 1);
    assert.equal(detail.body.data.transfer.id, transferId);
    assert.equal(detail.body.data.sourceRoom.id, String(data.sourceGraph.room._id));
    assert.equal(history.body.data.items.length, 1);
    assert.equal(history.body.data.items[0].sequence, 1);
});

test('receiving manager accepts with optimistic concurrency and terminal replay is rejected', async () => {
    const data = await fixture();
    const initiated = await requestJson(`/api/tickets/${data.ticket.id}/transfers`, {
        token: data.source.token, method: 'POST', headers: { 'If-Match': '1' },
        body: { destinationRoomId: String(data.destinationGraph.room._id), reason: 'Accept through HTTP' }
    });
    const path = `/api/ticket-transfers/${initiated.body.data.transfer.id}/accept`;
    const stale = await requestJson(path, {
        token: data.destination.token, method: 'POST', headers: { 'If-Match': '1' }, body: {}
    });
    assert.equal(stale.response.status, 409);
    assert.equal(stale.body.error.code, 'VERSION_CONFLICT');
    const accepted = await requestJson(path, {
        token: data.destination.token, method: 'POST', headers: { 'If-Match': '2' }, body: {}
    });
    assert.equal(accepted.response.status, 200);
    assert.equal(accepted.response.headers.get('etag'), '"3"');
    assert.equal(accepted.body.data.transfer.status, 'ACCEPTED');
    assert.equal(accepted.body.data.transfer.externalState, 'PROCESSING');
    assert.equal(accepted.body.data.ticket.activeTransferId, null);
    const replay = await requestJson(path, {
        token: data.destination.token, method: 'POST', headers: { 'If-Match': '3' }, body: {}
    });
    assert.equal(replay.response.status, 409);
    assert.equal(replay.body.error.code, 'TRANSFER_NOT_PENDING');
});

test('receiving manager cancels with a required reason and ownership returns to source', async () => {
    const data = await fixture();
    const initiated = await requestJson(`/api/tickets/${data.ticket.id}/transfers`, {
        token: data.source.token, method: 'POST', headers: { 'If-Match': '1' },
        body: { destinationRoomId: String(data.destinationGraph.room._id), reason: 'Cancellation HTTP setup' }
    });
    const path = `/api/ticket-transfers/${initiated.body.data.transfer.id}/cancel`;
    const invalid = await requestJson(path, {
        token: data.destination.token, method: 'POST', headers: { 'If-Match': '2' }, body: { reason: 'x' }
    });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_CANCELLATION_REASON');
    const cancelled = await requestJson(path, {
        token: data.destination.token, method: 'POST', headers: { 'If-Match': '2' },
        body: { reason: 'Destination cannot continue handling' }
    });
    assert.equal(cancelled.response.status, 200);
    assert.equal(cancelled.response.headers.get('etag'), '"3"');
    assert.equal(cancelled.body.data.transfer.status, 'CANCELLED');
    assert.equal(cancelled.body.data.ticket.currentRoomId, String(data.sourceGraph.room._id));
});

test('unknown and unsafe transfer query values are rejected without broad enumeration', async () => {
    const data = await fixture();
    for (const query of [
        'unknown=value', 'direction=SIDEWAYS', 'limit=101',
        'initiatedFrom=2026-07-20T00%3A00%3A00Z&initiatedTo=2026-07-19T00%3A00%3A00Z'
    ]) {
        const result = await requestJson(`/api/ticket-transfers?${query}`, { token: data.source.token });
        assert.equal(result.response.status, 400, query);
    }
});
