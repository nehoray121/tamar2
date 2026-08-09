const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, before, beforeEach, test } = require('node:test');
const User = require('../src/models/User.js');
const createApp = require('../src/app.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { createPhase7aFixture } = require('./helpers/phase7aFixture.js');
const {
    createTestConfig, createVerifier, initializeAuthKeys, signToken
} = require('./helpers/authFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let config;
let services;
let server;
let baseUrl;
let identityCounter = 0;

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

const provision = async (user) => {
    identityCounter += 1;
    const subject = `phase7-http-${identityCounter}`;
    const personalNumber = `7${String(identityCounter).padStart(6, '0')}`;
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    await User.updateOne({ _id: user._id }, { $set: {
        externalIdentity: { provider: config.auth.providerKey, subject },
        personalNumberLookupHash: protectedNumber.lookupHash,
        personalNumberLast4: protectedNumber.last4
    } });
    return signToken({
        subject, personalNumber, displayName: user.displayName, email: user.email
    });
};

const fixture = async () => {
    const data = await createPhase7aFixture(services, 'http');
    return { ...data, token: await provision(data.users.sourceUser) };
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

test('all four Message routes require authenticated provisioned active membership', async () => {
    const ticketId = '507f1f77bcf86cd799439011';
    const messageId = '507f191e810c19729de860ea';
    const routes = [
        ['GET', `/api/tickets/${ticketId}/messages`],
        ['POST', `/api/tickets/${ticketId}/messages`, { clientMessageId: randomUUID(), content: 'message' }],
        ['PATCH', `/api/tickets/${ticketId}/messages/${messageId}`, { content: 'edited' }],
        ['DELETE', `/api/tickets/${ticketId}/messages/${messageId}`]
    ];
    for (const [method, path, body] of routes) {
        const missing = await requestJson(path, { method, body, headers: { 'If-Match': '1' } });
        assert.equal(missing.response.status, 401, `${method} ${path}`);
        assert.equal(missing.body.error.code, 'AUTHENTICATION_REQUIRED');
        const invalid = await requestJson(path, {
            token: 'not-a-jwt', method, body, headers: { 'If-Match': '1' }
        });
        assert.equal(invalid.response.status, 401, `${method} ${path} invalid token`);
    }
});

test('create and idempotent replay return acknowledgement, Message ETag and no-store', async () => {
    const data = await fixture();
    const path = `/api/tickets/${data.ticket.id}/messages`;
    const payload = { clientMessageId: randomUUID(), content: '  הודעת HTTP  ' };
    const created = await requestJson(path, { token: data.token, method: 'POST', body: payload });
    assert.equal(created.response.status, 201);
    assert.equal(created.response.headers.get('etag'), '"1"');
    assert.equal(created.response.headers.get('cache-control'), 'no-store');
    assert.equal(created.body.data.message.content, 'הודעת HTTP');
    assert.equal(created.body.data.acknowledgement.clientMessageId, payload.clientMessageId);
    assert.equal(created.body.data.acknowledgement.messageId, created.body.data.message.id);
    const replay = await requestJson(path, {
        token: data.token, method: 'POST', body: { ...payload, content: 'הודעת HTTP' }
    });
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.data.message.id, created.body.data.message.id);
});

test('list, edit and delete expose chronological safe DTOs and message-level ETags', async () => {
    const data = await fixture();
    const collection = `/api/tickets/${data.ticket.id}/messages`;
    const first = await requestJson(collection, {
        token: data.token, method: 'POST',
        body: { clientMessageId: randomUUID(), content: 'first' }
    });
    await requestJson(collection, {
        token: data.token, method: 'POST',
        body: { clientMessageId: randomUUID(), content: 'second' }
    });
    const list = await requestJson(`${collection}?limit=1`, { token: data.token });
    assert.equal(list.response.status, 200);
    assert.equal(list.response.headers.get('cache-control'), 'no-store');
    assert.equal(list.body.data.items.length, 1);
    assert.equal(list.body.data.items[0].content, 'second');
    assert.equal(list.body.data.pageInfo.hasMoreBefore, true);
    const itemPath = `${collection}/${first.body.data.message.id}`;
    const missingPrecondition = await requestJson(itemPath, {
        token: data.token, method: 'PATCH', body: { content: 'edited' }
    });
    assert.equal(missingPrecondition.response.status, 428);
    const edited = await requestJson(itemPath, {
        token: data.token, method: 'PATCH', headers: { 'If-Match': '"1"' },
        body: { content: 'edited' }
    });
    assert.equal(edited.response.status, 200);
    assert.equal(edited.response.headers.get('etag'), '"2"');
    assert.equal(edited.body.data.message.isEdited, true);
    const deleted = await requestJson(itemPath, {
        token: data.token, method: 'DELETE', headers: { 'If-Match': '2' }
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.response.headers.get('etag'), '"3"');
    assert.equal(deleted.body.data.message.content, null);
    assert.equal(deleted.body.data.message.isDeleted, true);
    assert.deepEqual(deleted.body.data.message.capabilities, { canEdit: false, canDelete: false });
});

test('strict Message validation rejects unknown fields, invalid UUID, invalid cursor and stale versions', async () => {
    const data = await fixture();
    const collection = `/api/tickets/${data.ticket.id}/messages`;
    for (const body of [
        { clientMessageId: randomUUID(), content: 'valid', authorUserId: String(data.users.superAdmin._id) },
        { clientMessageId: 'not-a-uuid', content: 'valid' },
        { clientMessageId: randomUUID(), content: '' },
        { clientMessageId: randomUUID(), content: { $where: 'unsafe' } }
    ]) {
        const result = await requestJson(collection, { token: data.token, method: 'POST', body });
        assert.equal(result.response.status, 400);
    }
    const query = await requestJson(`${collection}?before=***`, { token: data.token });
    assert.equal(query.response.status, 400);
    assert.equal(query.body.error.code, 'VALIDATION_ERROR');
    const unknownQuery = await requestJson(`${collection}?search=secret`, { token: data.token });
    assert.equal(unknownQuery.response.status, 400);
    const created = await requestJson(collection, {
        token: data.token, method: 'POST', body: { clientMessageId: randomUUID(), content: 'versioned' }
    });
    const stale = await requestJson(`${collection}/${created.body.data.message.id}`, {
        token: data.token, method: 'PATCH', headers: { 'If-Match': '2' }, body: { content: 'stale' }
    });
    assert.equal(stale.response.status, 409);
    assert.equal(stale.body.error.code, 'MESSAGE_VERSION_CONFLICT');
});

test('unapproved Message surfaces return JSON 404', async () => {
    const data = await fixture();
    const id = '507f191e810c19729de860ea';
    for (const [method, path] of [
        ['POST', `/api/tickets/${data.ticket.id}/messages/${id}/restore`],
        ['POST', `/api/tickets/${data.ticket.id}/messages/${id}/attachments`],
        ['GET', `/api/tickets/${data.ticket.id}/messages/search`]
    ]) {
        const result = await requestJson(path, { token: data.token, method, body: method === 'POST' ? {} : undefined });
        assert.equal(result.response.status, 404, `${method} ${path}`);
        assert.equal(result.body.error.code, 'NOT_FOUND');
    }
});
