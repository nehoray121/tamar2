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
    const response = await fetch(baseUrl + path, {
        method,
        headers: {
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...headers
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { response, body: await response.json() };
};

const createFixture = async () => {
    counter += 1;
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: 'P8HTTP' + counter, name: 'Phase 8 HTTP System' });
    const environment = await management.createEnvironment({
        systemId: system._id,
        key: 'p8-http-environment-' + counter,
        name: 'Environment'
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id,
        environmentId: environment._id,
        key: 'p8-http-sub-environment-' + counter,
        name: 'Sub Environment'
    });
    const room = await management.createRoom({
        systemId: system._id,
        environmentId: environment._id,
        subEnvironmentId: subEnvironment._id,
        key: 'p8-http-room-' + counter,
        name: 'Room'
    });
    const subject = 'phase8-http-' + counter;
    const personalNumber = '9' + String(counter).padStart(6, '0');
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    const user = await services.userRepository.create({
        externalIdentity: { provider: config.auth.providerKey, subject },
        personalNumberLookupHash: protectedNumber.lookupHash,
        personalNumberLast4: protectedNumber.last4,
        displayName: 'Phase 8 HTTP Room User',
        email: subject + '@example.test',
        isActive: true
    });
    await services.membershipRepository.create({
        userId: user._id,
        role: ROLES.ROOM_USER,
        scopeType: SCOPE_TYPES.ROOM,
        scopeId: room._id,
        systemId: system._id,
        environmentId: environment._id,
        subEnvironmentId: subEnvironment._id,
        roomId: room._id,
        isActive: true,
        assignedBy: user._id
    });
    const token = await signToken({
        subject,
        personalNumber,
        displayName: user.displayName,
        email: user.email
    });
    const ticket = await services.tickets.ticketService.create(user._id, {
        roomId: String(room._id),
        subject: 'HTTP Board ticket',
        description: 'HTTP Board endpoint coverage',
        priority: 'MEDIUM'
    });
    return { room, token, ticket, user };
};

before(async () => {
    await initializeAuthKeys();
    await connectTestDatabase();
    config = createTestConfig();
    services = createServiceContainer({ config, logger });
    services.auth.accessTokenVerifier = createVerifier(config.auth);
    server = createApp({ config, logger, services }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(clearTestCollections);
after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await dropAndDisconnectTestDatabase();
});

test('all seven Board endpoints reject missing and invalid access tokens with no-store responses', async () => {
    const id = '507f1f77bcf86cd799439011';
    const routes = [
        ['GET', '/api/rooms/' + id + '/boards/OPEN/items'],
        ['GET', '/api/rooms/' + id + '/boards/OPEN/categories'],
        ['POST', '/api/rooms/' + id + '/boards/OPEN/categories', { name: 'Category' }],
        ['PATCH', '/api/rooms/' + id + '/boards/OPEN/categories/' + id, { name: 'Category' }],
        ['POST', '/api/rooms/' + id + '/boards/OPEN/categories/' + id + '/archive', {}],
        ['GET', '/api/rooms/' + id + '/boards/OPEN/items/' + id + '/state'],
        ['PATCH', '/api/rooms/' + id + '/boards/OPEN/items/' + id + '/state', { isPinned: true }]
    ];
    const invalidToken = await signToken({ issuer: 'https://wrong-issuer.example/' });

    for (const [method, path, body] of routes) {
        const missing = await requestJson(path, { method, body });
        assert.equal(missing.response.status, 401, method + ' ' + path);
        assert.equal(missing.body.error.code, 'AUTHENTICATION_REQUIRED');
        assert.equal(missing.response.headers.get('cache-control'), 'no-store');

        const invalid = await requestJson(path, { token: invalidToken, method, body });
        assert.equal(invalid.response.status, 401, method + ' ' + path);
        assert.equal(invalid.body.error.code, 'INVALID_ACCESS_TOKEN');
        assert.equal(invalid.response.headers.get('cache-control'), 'no-store');
    }
});

test('ROOM_USER completes the category and shared-state lifecycle through the canonical HTTP API', async () => {
    const data = await createFixture();
    const board = '/api/rooms/' + data.room._id + '/boards/OPEN';

    const protectedField = await requestJson(board + '/categories', {
        token: data.token,
        method: 'POST',
        body: { name: 'Not allowed', normalizedName: 'client-value' }
    });
    assert.equal(protectedField.response.status, 400);

    const created = await requestJson(board + '/categories', {
        token: data.token,
        method: 'POST',
        body: { name: '  Shared   category ', description: 'Room shared', color: '#2A6DEF' }
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.response.headers.get('etag'), '"1"');
    assert.equal(created.body.data.name, 'Shared category');
    const categoryId = created.body.data.id;

    const categories = await requestJson(board + '/categories', { token: data.token });
    assert.equal(categories.response.status, 200);
    assert.equal(categories.body.data.items.length, 1);

    const initialState = await requestJson(
        board + '/items/' + data.ticket.id + '/state',
        { token: data.token }
    );
    assert.equal(initialState.response.status, 200);
    assert.equal(initialState.response.headers.get('etag'), '"0"');
    assert.equal(initialState.body.data.version, 0);

    const assigned = await requestJson(board + '/items/' + data.ticket.id + '/state', {
        token: data.token,
        method: 'PATCH',
        headers: { 'If-Match': '"0"' },
        body: { categoryId, isPinned: true }
    });
    assert.equal(assigned.response.status, 200);
    assert.equal(assigned.response.headers.get('etag'), '"1"');
    assert.equal(assigned.body.data.category.id, categoryId);
    assert.equal(assigned.body.data.isPinned, true);

    const stale = await requestJson(board + '/items/' + data.ticket.id + '/state', {
        token: data.token,
        method: 'PATCH',
        headers: { 'If-Match': '"0"' },
        body: { isPinned: false }
    });
    assert.equal(stale.response.status, 409);
    assert.equal(stale.body.error.code, 'BOARD_STATE_VERSION_CONFLICT');

    const items = await requestJson(
        board + '/items?categoryId=' + categoryId + '&categoryMode=CATEGORIZED&pinMode=PINNED',
        { token: data.token }
    );
    assert.equal(items.response.status, 200);
    assert.equal(items.body.data.pagination.totalItems, 1);
    assert.equal(items.body.data.items[0].ticket.id, data.ticket.id);

    const updated = await requestJson(board + '/categories/' + categoryId, {
        token: data.token,
        method: 'PATCH',
        headers: { 'If-Match': '1' },
        body: { description: 'Updated description' }
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.response.headers.get('etag'), '"2"');

    const archived = await requestJson(board + '/categories/' + categoryId + '/archive', {
        token: data.token,
        method: 'POST',
        headers: { 'If-Match': '"2"' },
        body: {}
    });
    assert.equal(archived.response.status, 200);
    assert.equal(archived.response.headers.get('etag'), '"3"');
    assert.equal(archived.body.data.isActive, false);

    const removed = await requestJson(board + '/items/' + data.ticket.id + '/state', {
        token: data.token,
        method: 'PATCH',
        headers: { 'If-Match': '"1"' },
        body: { categoryId: null, isPinned: false }
    });
    assert.equal(removed.response.status, 200);
    assert.equal(removed.response.headers.get('etag'), '"2"');
    assert.equal(removed.body.data.category, null);
    assert.equal(removed.body.data.isPinned, false);
});

test('invalid Board type, unknown query keys and unknown Board routes fail closed', async () => {
    const data = await createFixture();
    const roomId = data.room._id;
    const invalidType = await requestJson(
        '/api/rooms/' + roomId + '/boards/HISTORY/items',
        { token: data.token }
    );
    assert.equal(invalidType.response.status, 400);
    assert.equal(invalidType.body.error.code, 'BOARD_TYPE_INVALID');

    const invalidQuery = await requestJson(
        '/api/rooms/' + roomId + '/boards/OPEN/items?ownerId=' + data.user._id,
        { token: data.token }
    );
    assert.equal(invalidQuery.response.status, 400);
    assert.equal(invalidQuery.body.error.code, 'INVALID_BOARD_QUERY');

    const unknown = await requestJson(
        '/api/rooms/' + roomId + '/boards/OPEN/items/' + data.ticket.id + '/pin',
        { token: data.token, method: 'POST', body: {} }
    );
    assert.equal(unknown.response.status, 404);
    assert.equal(unknown.body.error.code, 'NOT_FOUND');
});
