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
const createFixture = async (role = ROLES.ROOM_MANAGER, suffix = String(++counter)) => {
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `http-system-${suffix}`, name: 'System' });
    const environment = await management.createEnvironment({ systemId: system._id, key: `http-env-${suffix}`, name: 'Environment' });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id, key: `http-sub-${suffix}`, name: 'SubEnvironment'
    });
    const room = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: `http-room-${suffix}`, name: 'Room'
    });
    const subject = `ticket-http-${suffix}`;
    const personalNumber = `8${String(counter).padStart(6, '0')}`;
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    const user = await services.userRepository.create({
        externalIdentity: { provider: config.auth.providerKey, subject },
        personalNumberLookupHash: protectedNumber.lookupHash,
        personalNumberLast4: protectedNumber.last4,
        displayName: `HTTP User ${suffix}`,
        isActive: true
    });
    const roomRole = [ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(role);
    await services.membershipRepository.create({
        userId: user._id, role,
        scopeType: roomRole ? SCOPE_TYPES.ROOM : (role === ROLES.SYSTEM_ADMIN ? SCOPE_TYPES.SUB_ENVIRONMENT : SCOPE_TYPES.SYSTEM),
        scopeId: roomRole ? room._id : (role === ROLES.SYSTEM_ADMIN ? subEnvironment._id : system._id),
        systemId: system._id,
        environmentId: role === ROLES.SUPER_ADMIN ? undefined : environment._id,
        subEnvironmentId: role === ROLES.SUPER_ADMIN ? undefined : subEnvironment._id,
        roomId: roomRole ? room._id : undefined,
        isActive: true, assignedBy: user._id
    });
    const token = await signToken({ subject, personalNumber, displayName: `HTTP User ${suffix}` });
    return { system, environment, subEnvironment, room, user, token };
};
const createBody = (fixture, overrides = {}) => ({
    roomId: String(fixture.room._id),
    subject: 'HTTP core ticket',
    description: 'Created through the authenticated HTTP route',
    priority: 'MEDIUM',
    fieldValues: { channel: 'http' },
    ...overrides
});

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

test('all Ticket endpoints require a verified Bearer token and return no-store', async () => {
    for (const path of ['/api/tickets', `/api/tickets/507f1f77bcf86cd799439011`]) {
        const result = await requestJson(path);
        assert.equal(result.response.status, 401);
        assert.equal(result.body.error.code, 'AUTHENTICATION_REQUIRED');
        assert.equal(result.response.headers.get('cache-control'), 'no-store');
    }
});

test('POST /api/tickets rejects protected and unknown fields', async () => {
    const fixture = await createFixture();
    for (const extra of [{ createdBy: fixture.user._id }, { visibleRoomIds: [fixture.room._id] }, { unknown: true }]) {
        const result = await requestJson('/api/tickets', { token: fixture.token, method: 'POST', body: { ...createBody(fixture), ...extra } });
        assert.equal(result.response.status, 400);
        assert.equal(result.body.error.code, 'VALIDATION_ERROR');
    }
});

test('POST and GET return safe DTO capabilities, ETag and no raw Mongo version', async () => {
    const fixture = await createFixture();
    const created = await requestJson('/api/tickets', { token: fixture.token, method: 'POST', body: createBody(fixture) });
    assert.equal(created.response.status, 201);
    assert.equal(created.response.headers.get('etag'), '"1"');
    assert.equal(created.response.headers.get('cache-control'), 'no-store');
    assert.equal(created.body.data.capabilities.canEdit, true);
    assert.equal(created.body.data.__v, undefined);
    const detail = await requestJson(`/api/tickets/${created.body.data.id}`, { token: fixture.token });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.response.headers.get('etag'), '"1"');
    assert.equal(JSON.stringify(detail.body).includes('personalNumberLookupHash'), false);
});

test('list query rejects unknown keys, invalid ranges, invalid priority and oversized limits', async () => {
    const fixture = await createFixture();
    for (const query of [
        'unknown=true',
        'limit=101',
        'createdFrom=2026-02-02T00:00:00Z&createdTo=2026-01-01T00:00:00Z'
    ]) {
        const result = await requestJson(`/api/tickets?${query}`, { token: fixture.token });
        assert.equal(result.response.status, 400);
        assert.equal(result.body.error.code, 'INVALID_TICKET_QUERY');
    }
    const invalidPriority = await requestJson('/api/tickets?priority=URGENT', { token: fixture.token });
    assert.equal(invalidPriority.response.status, 400);
    assert.equal(invalidPriority.body.error.code, 'INVALID_TICKET_PRIORITY');
    const invalidStatus = await requestJson('/api/tickets', {
        token: fixture.token, method: 'POST', body: { ...createBody(fixture), status: 'OPEN' }
    });
    assert.equal(invalidStatus.response.status, 400);
    assert.equal(invalidStatus.body.error.code, 'INVALID_TICKET_STATUS');
});

test('PATCH requires If-Match, accepts quoted version, emits new ETag and rejects stale writers', async () => {
    const fixture = await createFixture();
    const created = await requestJson('/api/tickets', { token: fixture.token, method: 'POST', body: createBody(fixture) });
    const path = `/api/tickets/${created.body.data.id}`;
    const missing = await requestJson(path, { token: fixture.token, method: 'PATCH', body: { priority: 'HIGH' } });
    const malformed = await requestJson(path, { token: fixture.token, method: 'PATCH', headers: { 'If-Match': 'W/"1"' }, body: { priority: 'HIGH' } });
    const updated = await requestJson(path, { token: fixture.token, method: 'PATCH', headers: { 'If-Match': '"1"' }, body: { priority: 'HIGH' } });
    const stale = await requestJson(path, { token: fixture.token, method: 'PATCH', headers: { 'If-Match': '1' }, body: { priority: 'LOW' } });
    assert.equal(missing.response.status, 428);
    assert.equal(missing.body.error.code, 'PRECONDITION_REQUIRED');
    assert.equal(malformed.response.status, 400);
    assert.equal(updated.response.headers.get('etag'), '"2"');
    assert.equal(stale.response.status, 409);
    assert.equal(stale.body.error.code, 'VERSION_CONFLICT');
});

test('ROOM_USER receives edit-forbidden capabilities but may close through the dedicated route', async () => {
    const fixture = await createFixture(ROLES.ROOM_USER);
    const created = await requestJson('/api/tickets', { token: fixture.token, method: 'POST', body: createBody(fixture) });
    const edit = await requestJson(`/api/tickets/${created.body.data.id}`, {
        token: fixture.token, method: 'PATCH', headers: { 'If-Match': '1' }, body: { subject: 'Not permitted' }
    });
    const closed = await requestJson(`/api/tickets/${created.body.data.id}/close`, {
        token: fixture.token, method: 'POST', headers: { 'If-Match': '"1"' }, body: { closureSummary: 'Resolved successfully' }
    });
    assert.equal(created.body.data.capabilities.canEdit, false);
    assert.equal(created.body.data.capabilities.canClose, true);
    assert.equal(edit.response.status, 403);
    assert.equal(edit.body.error.code, 'TICKET_EDIT_FORBIDDEN');
    assert.equal(closed.response.status, 200);
    assert.equal(closed.body.data.status, 'CLOSED');
    assert.equal(closed.body.data.capabilities.readOnlyReason, 'TICKET_CLOSED');
});

test('history route is paginated and returns only safe immutable business events', async () => {
    const fixture = await createFixture();
    const created = await requestJson('/api/tickets', { token: fixture.token, method: 'POST', body: createBody(fixture) });
    await requestJson(`/api/tickets/${created.body.data.id}`, {
        token: fixture.token, method: 'PATCH', headers: { 'If-Match': '1' }, body: { subject: 'Updated through HTTP' }
    });
    const history = await requestJson(`/api/tickets/${created.body.data.id}/history?page=1&limit=1&sortDirection=asc`, { token: fixture.token });
    assert.equal(history.response.status, 200);
    assert.equal(history.body.data.pagination.totalItems, 2);
    assert.equal(history.body.data.items.length, 1);
    assert.equal(history.body.data.items[0].eventType, 'TICKET_CREATED');
    assert.doesNotMatch(JSON.stringify(history.body), /authorization|personalNumber|accessToken/i);
});
