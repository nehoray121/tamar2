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

const requestJson = async (requestPath, { token, method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${requestPath}`, {
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
    const subject = `phase7v-http-${identityCounter}`;
    const personalNumber = `8${String(identityCounter).padStart(6, '0')}`;
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

test('HTTP Message payload rejects attachment, file, identity, capability, and unknown-field injection', async () => {
    const data = await createPhase7aFixture(services, 'v-http-injection');
    const token = await provision(data.users.sourceUser);
    const collection = `/api/tickets/${data.ticket.id}/messages`;
    const protectedFields = [
        ['attachment', { name: 'payload.txt' }],
        ['file', 'payload.txt'],
        ['attachments', []],
        ['authorUserId', String(data.users.superAdmin._id)],
        ['author', { id: String(data.users.superAdmin._id) }],
        ['capabilities', { canEdit: true, canDelete: true }],
        ['isDeleted', true],
        ['version', 99]
    ];
    for (const [field, value] of protectedFields) {
        const result = await requestJson(collection, {
            token,
            method: 'POST',
            body: { clientMessageId: randomUUID(), content: 'valid content', [field]: value }
        });
        assert.equal(result.response.status, 400, field);
        assert.equal(result.body.error.code, 'VALIDATION_ERROR', field);
    }
    const created = await requestJson(collection, {
        token,
        method: 'POST',
        body: { clientMessageId: randomUUID(), content: 'editable' }
    });
    const itemPath = `${collection}/${created.body.data.message.id}`;
    const editInjection = await requestJson(itemPath, {
        token,
        method: 'PATCH',
        headers: { 'If-Match': '1' },
        body: { content: 'edited', attachmentId: 'forbidden' }
    });
    assert.equal(editInjection.response.status, 400);
    const deleteInjection = await requestJson(itemPath, {
        token,
        method: 'DELETE',
        headers: { 'If-Match': '1' },
        body: { restore: true }
    });
    assert.equal(deleteInjection.response.status, 400);
});

test('HTTP Message pagination validates limits and stable empty responses', async () => {
    const data = await createPhase7aFixture(services, 'v-http-pagination');
    const token = await provision(data.users.sourceUser);
    const collection = `/api/tickets/${data.ticket.id}/messages`;
    for (const query of ['limit=0', 'limit=101', 'limit=1.5', 'before=***', 'extra=true']) {
        const result = await requestJson(`${collection}?${query}`, { token });
        assert.equal(result.response.status, 400, query);
        assert.equal(result.body.error.code, 'VALIDATION_ERROR', query);
    }
    const empty = await requestJson(`${collection}?limit=10`, { token });
    assert.equal(empty.response.status, 200);
    assert.deepEqual(empty.body.data.items, []);
    assert.deepEqual(empty.body.data.pageInfo, {
        limit: 10, hasMoreBefore: false, nextBeforeCursor: null
    });
});

test('HTTP Message DTOs expose safe author summaries and no protected identity or idempotency data', async () => {
    const data = await createPhase7aFixture(services, 'v-http-privacy');
    const authorToken = await provision(data.users.sourceUser);
    const readerToken = await provision(data.users.sourceManager);
    const clientMessageId = randomUUID();
    const collection = `/api/tickets/${data.ticket.id}/messages`;
    const created = await requestJson(collection, {
        token: authorToken,
        method: 'POST',
        body: { clientMessageId, content: 'privacy safe message' }
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.acknowledgement.clientMessageId, clientMessageId);
    const listed = await requestJson(collection, { token: readerToken });
    assert.equal(listed.response.status, 200);
    const serialized = JSON.stringify(listed.body.data);
    assert.equal(serialized.includes(clientMessageId), false);
    for (const forbidden of [
        'personalNumber', 'personalNumberLast4', 'personalNumberLookupHash',
        'externalIdentity', 'rawClaims', 'memberships', 'accessRequests', '__v'
    ]) assert.equal(serialized.includes(forbidden), false, forbidden);
    assert.deepEqual(Object.keys(listed.body.data.items[0].author).sort(), [
        'displayName', 'email', 'id'
    ]);
});
