const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const createApp = require('../src/app.js');
const { ACCESS_REQUEST_TYPES, ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const AccessRequest = require('../src/models/AccessRequest.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const User = require('../src/models/User.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');
const { createTestConfig, createVerifier, initializeAuthKeys, signToken } = require('./helpers/authFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let config;
let services;
let server;
let baseUrl;

const startServer = (app) => new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
});
const requestJson = async (path, { token, method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { response, body: await response.json() };
};
const authIdentity = ({ subject, personalNumber, displayName = `User ${subject}`, email = `${subject}@example.com` }) => {
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    return { issuer: config.auth.issuer, provider: config.auth.providerKey, subject, personalNumberLookupHash: protectedNumber.lookupHash, personalNumberLast4: protectedNumber.last4, displayName, email };
};
const createUser = async ({ subject, personalNumber, displayName, isActive = true }) => {
    const identity = authIdentity({ subject, personalNumber, displayName });
    const user = await services.userRepository.create({
        externalIdentity: { provider: identity.provider, subject: identity.subject },
        personalNumberLookupHash: identity.personalNumberLookupHash,
        personalNumberLast4: identity.personalNumberLast4,
        displayName: identity.displayName,
        email: identity.email,
        isActive
    });
    return { user, identity, token: await signToken({ subject, personalNumber, displayName: identity.displayName, email: identity.email }) };
};
const createGraph = async () => {
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: 'system-main', name: 'System Main' });
    const environment = await management.createEnvironment({ systemId: system._id, key: 'environment-main', name: 'Environment Main' });
    const subEnvironment = await management.createSubEnvironment({ systemId: system._id, environmentId: environment._id, key: 'sub-main', name: 'Sub Main' });
    const otherSubEnvironment = await management.createSubEnvironment({ systemId: system._id, environmentId: environment._id, key: 'sub-other', name: 'Sub Other' });
    const room = await management.createRoom({ systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id, key: 'room-main', name: 'Room Main' });
    const otherRoom = await management.createRoom({ systemId: system._id, environmentId: environment._id, subEnvironmentId: otherSubEnvironment._id, key: 'room-other', name: 'Room Other' });
    return { system, environment, subEnvironment, otherSubEnvironment, room, otherRoom };
};
const roomRequestBody = (graph, overrides = {}) => ({
    requestType: ACCESS_REQUEST_TYPES.INITIAL_ACCESS,
    requestedRole: ROLES.ROOM_USER,
    requestedScopeType: SCOPE_TYPES.ROOM,
    requestedScopeId: String(graph.room._id),
    systemId: String(graph.system._id),
    environmentId: String(graph.environment._id),
    subEnvironmentId: String(graph.subEnvironment._id),
    roomId: String(graph.room._id),
    reason: 'Need operational access',
    ...overrides
});
const approvalBody = (graph, approvedRole = ROLES.ROOM_USER, room = graph.room) => ({
    approvedRole,
    approvedScopeType: SCOPE_TYPES.ROOM,
    approvedScopeId: String(room._id),
    systemId: String(graph.system._id),
    environmentId: String(graph.environment._id),
    subEnvironmentId: String(room.subEnvironmentId),
    roomId: String(room._id),
    reviewComment: 'Approved in integration test'
});

before(async () => {
    await initializeAuthKeys();
    await connectTestDatabase();
    config = createTestConfig();
    services = createServiceContainer({ config, logger });
    services.auth.accessTokenVerifier = createVerifier(config.auth);
    server = await startServer(createApp({ config, logger, services }));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => { await clearTestCollections(); services.auth.requestThrottle.entries.clear(); });
after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await dropAndDisconnectTestDatabase();
});

test('GET /api/auth/me rejects a missing token with Bearer challenge', async () => {
    const { response, body } = await requestJson('/api/auth/me');
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Bearer');
    assert.equal(body.error.code, 'AUTHENTICATION_REQUIRED');
});
test('GET /api/auth/me rejects an invalid token without validation details', async () => {
    const { response, body } = await requestJson('/api/auth/me', { token: 'invalid.token.value' });
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'INVALID_ACCESS_TOKEN');
    assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('valid unprovisioned identity returns ACCESS_REQUIRED', async () => {
    const token = await signToken({ subject: 'new-user', personalNumber: '2000001' });
    const { response, body } = await requestJson('/api/auth/me', { token });
    assert.equal(response.status, 200);
    assert.equal(body.data.status, 'ACCESS_REQUIRED');
    assert.equal(body.data.identity.personalNumberMasked, '***0001');
});
test('active User without membership returns ACCESS_REQUIRED', async () => {
    const { token } = await createUser({ subject: 'no-membership', personalNumber: '2000002' });
    const { body } = await requestJson('/api/auth/me', { token });
    assert.equal(body.data.status, 'ACCESS_REQUIRED');
});
test('active User with effective membership returns AUTHORIZED', async () => {
    const graph = await createGraph();
    const { user, token } = await createUser({ subject: 'authorized', personalNumber: '2000003' });
    await services.membershipRepository.create({ userId: user._id, role: ROLES.ROOM_USER, scopeType: SCOPE_TYPES.ROOM, scopeId: graph.room._id, systemId: graph.system._id, environmentId: graph.environment._id, subEnvironmentId: graph.subEnvironment._id, roomId: graph.room._id, isActive: true });
    const { body } = await requestJson('/api/auth/me', { token });
    assert.equal(body.data.status, 'AUTHORIZED');
    assert.equal(body.data.user.personalNumberMasked, '***0003');
});
test('SUPER_ADMIN authority comes only from an active MongoDB membership, never token role claims', async () => {
    const graph = await createGraph();
    const personalNumber = '1234567';
    const subject = 'local-super-admin-contract';
    const { user, identity } = await createUser({ subject, personalNumber, displayName: 'Local SUPER_ADMIN Contract' });
    const token = await signToken({
        subject,
        personalNumber,
        displayName: identity.displayName,
        email: identity.email,
        extraClaims: { role: ROLES.SUPER_ADMIN, roles: [ROLES.SUPER_ADMIN] }
    });

    const withoutMembership = await requestJson('/api/auth/me', { token });
    assert.equal(withoutMembership.body.data.status, 'ACCESS_REQUIRED');
    assert.equal(withoutMembership.body.data.reason, 'NO_ACTIVE_MEMBERSHIPS');
    assert.equal(withoutMembership.body.data.capabilities, undefined);

    await services.membershipRepository.create({
        userId: user._id,
        role: ROLES.SUPER_ADMIN,
        scopeType: SCOPE_TYPES.SYSTEM,
        scopeId: graph.system._id,
        systemId: graph.system._id,
        isActive: true,
        assignedBy: user._id
    });
    const authorized = await requestJson('/api/auth/me', { token });
    assert.equal(authorized.body.data.status, 'AUTHORIZED');
    assert.equal(authorized.body.data.capabilities.manageSystem, true);
    assert.deepEqual(authorized.body.data.memberships.map((item) => item.role), [ROLES.SUPER_ADMIN]);

    const stored = await User.findById(user._id).select('+personalNumberLookupHash +personalNumberLast4').lean();
    assert.match(stored.personalNumberLookupHash, /^[a-f0-9]{64}$/);
    assert.equal(stored.personalNumberLast4, '4567');
    assert.equal(stored.personalNumber, undefined);
    assert.doesNotMatch(JSON.stringify(stored), /1234567/);

    await OrganizationMembership.deleteMany({ userId: user._id });
    const afterRemoval = await requestJson('/api/auth/me', { token });
    assert.equal(afterRemoval.body.data.status, 'ACCESS_REQUIRED');
    assert.equal(afterRemoval.body.data.reason, 'NO_ACTIVE_MEMBERSHIPS');
    assert.equal(afterRemoval.body.data.capabilities, undefined);
});

test('disabled User returns USER_DISABLED and cannot request access', async () => {
    const graph = await createGraph();
    const { token } = await createUser({ subject: 'disabled', personalNumber: '2000004', isActive: false });
    const me = await requestJson('/api/auth/me', { token });
    const create = await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph) });
    assert.equal(me.response.status, 403);
    assert.equal(me.body.error.code, 'USER_DISABLED');
    assert.equal(create.response.status, 403);
});
test('auth response never exposes full personal number or lookup hash', async () => {
    const token = await signToken({ subject: 'privacy', personalNumber: '2999999' });
    const { body } = await requestJson('/api/auth/me', { token });
    const serialized = JSON.stringify(body);
    assert.doesNotMatch(serialized, /2999999/);
    assert.doesNotMatch(serialized, /personalNumberLookupHash/);
});
test('authenticated unprovisioned identity can create INITIAL_ACCESS', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'requester', personalNumber: '3000001' });
    const { response, body } = await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph) });
    assert.equal(response.status, 201);
    assert.equal(body.data.requestedRole, ROLES.ROOM_USER);
});
test('browser-supplied personal number is rejected as an unknown identity field', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'spoof', personalNumber: '3000002' });
    const result = await requestJson('/api/access-requests', { token, method: 'POST', body: { ...roomRequestBody(graph), personalNumber: '9999999' } });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'VALIDATION_ERROR');
});
test('browser-supplied provider and subject are rejected', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'spoof-binding', personalNumber: '3000003' });
    const result = await requestJson('/api/access-requests', { token, method: 'POST', body: { ...roomRequestBody(graph), provider: 'fake', subject: 'fake' } });
    assert.equal(result.response.status, 400);
});
test('SUPER_ADMIN and deprecated roles are rejected by creation schema', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'bad-role', personalNumber: '3000004' });
    for (const role of ['SUPER_ADMIN', 'environment_admin', 'room_admin']) {
        const result = await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph, { requestedRole: role }) });
        assert.equal(result.response.status, 400);
    }
});
test('role-to-scope mismatch is rejected', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'scope-mismatch', personalNumber: '3000005' });
    const result = await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph, { requestedRole: ROLES.SYSTEM_ADMIN }) });
    assert.equal(result.response.status, 400);
});
test('incorrect organization lineage is rejected', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'lineage', personalNumber: '3000006' });
    const result = await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph, { subEnvironmentId: String(graph.otherSubEnvironment._id) }) });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'INVALID_SCOPE_HIERARCHY');
});
test('equivalent pending Access Request is rejected', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'duplicate', personalNumber: '3000007' });
    const first = await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph) });
    const second = await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph) });
    assert.equal(first.response.status, 201);
    assert.equal(second.response.status, 409);
    assert.equal(second.body.error.code, 'ACCESS_REQUEST_DUPLICATE');
});
test('Access Request stores only protected verified identity snapshot', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'stored-safe', personalNumber: '3000008' });
    await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph) });
    const stored = await AccessRequest.findOne({}).select('+requesterIdentitySnapshot.personalNumberLookupHash +requesterIdentitySnapshot.personalNumberLast4').lean();
    assert.match(stored.requesterIdentitySnapshot.personalNumberLookupHash, /^[a-f0-9]{64}$/);
    assert.equal(stored.requesterIdentitySnapshot.personalNumber, undefined);
    assert.equal(stored.requesterIdentitySnapshot.identityNumber, undefined);
    assert.doesNotMatch(JSON.stringify(stored), /3000008/);
});
test('GET /api/access-requests/me returns only current verified identity requests', async () => {
    const graph = await createGraph();
    const own = await signToken({ subject: 'owner', personalNumber: '3000009' });
    const other = await signToken({ subject: 'other', personalNumber: '3000010' });
    await requestJson('/api/access-requests', { token: own, method: 'POST', body: roomRequestBody(graph) });
    const result = await requestJson('/api/access-requests/me', { token: other });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.length, 0);
});
test('pending request changes auth state to ACCESS_REQUEST_PENDING', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'pending', personalNumber: '3000011' });
    await requestJson('/api/access-requests', { token, method: 'POST', body: roomRequestBody(graph) });
    const { body } = await requestJson('/api/auth/me', { token });
    assert.equal(body.data.status, 'ACCESS_REQUEST_PENDING');
});
test('access-request options are authenticated and expose only active hierarchy data', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'options', personalNumber: '3000012' });
    const missing = await requestJson('/api/access-request-options');
    const result = await requestJson(`/api/access-request-options?systemId=${graph.system._id}&environmentId=${graph.environment._id}&subEnvironmentId=${graph.subEnvironment._id}`, { token });
    assert.equal(missing.response.status, 401);
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.rooms.length, 1);
    assert.deepEqual(result.body.data.requestableRoles.map((item) => item.role), [ROLES.ROOM_USER, ROLES.ROOM_MANAGER, ROLES.SYSTEM_ADMIN]);
});
test('access-request options reject inconsistent parent filters', async () => {
    const graph = await createGraph();
    const token = await signToken({ subject: 'options-lineage', personalNumber: '3000013' });
    const result = await requestJson(`/api/access-request-options?environmentId=${graph.environment._id}`, { token });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'SCOPE_LINEAGE_MISMATCH');
});
test('approval route requires provisioned active approver membership', async () => {
    const graph = await createGraph();
    const requesterToken = await signToken({ subject: 'approval-no-authority', personalNumber: '4000001' });
    const created = await requestJson('/api/access-requests', { token: requesterToken, method: 'POST', body: roomRequestBody(graph) });
    const reviewer = await createUser({ subject: 'plain-reviewer', personalNumber: '4000002' });
    const result = await requestJson(`/api/access-requests/${created.body.data.id}/approve`, { token: reviewer.token, method: 'POST', body: approvalBody(graph) });
    assert.equal(result.response.status, 403);
});
test('SUPER_ADMIN approval creates unprovisioned User and Membership transactionally', async () => {
    const graph = await createGraph();
    const requesterToken = await signToken({ subject: 'provision-on-approval', personalNumber: '4000003', displayName: 'Provisioned Person' });
    const created = await requestJson('/api/access-requests', { token: requesterToken, method: 'POST', body: roomRequestBody(graph) });
    const reviewer = await createUser({ subject: 'super-reviewer', personalNumber: '4000004' });
    await services.membershipRepository.create({ userId: reviewer.user._id, role: ROLES.SUPER_ADMIN, scopeType: SCOPE_TYPES.SYSTEM, scopeId: graph.system._id, systemId: graph.system._id, isActive: true, assignedBy: reviewer.user._id });
    const result = await requestJson(`/api/access-requests/${created.body.data.id}/approve`, { token: reviewer.token, method: 'POST', body: approvalBody(graph) });
    assert.equal(result.response.status, 200);
    const provisioned = await User.findOne({ displayName: 'Provisioned Person' }).select('+personalNumberLookupHash').lean();
    assert.ok(provisioned);
    assert.equal(await OrganizationMembership.countDocuments({ userId: provisioned._id, role: ROLES.ROOM_USER }), 1);
});
test('approval with lower role records APPROVED_WITH_CHANGES', async () => {
    const graph = await createGraph();
    const requesterToken = await signToken({ subject: 'lower-role', personalNumber: '4000005' });
    const created = await requestJson('/api/access-requests', { token: requesterToken, method: 'POST', body: roomRequestBody(graph, { requestedRole: ROLES.ROOM_MANAGER }) });
    const reviewer = await createUser({ subject: 'lower-super', personalNumber: '4000006' });
    await services.membershipRepository.create({ userId: reviewer.user._id, role: ROLES.SUPER_ADMIN, scopeType: SCOPE_TYPES.SYSTEM, scopeId: graph.system._id, systemId: graph.system._id, isActive: true, assignedBy: reviewer.user._id });
    const result = await requestJson(`/api/access-requests/${created.body.data.id}/approve`, { token: reviewer.token, method: 'POST', body: approvalBody(graph, ROLES.ROOM_USER) });
    assert.equal(result.body.data.status, 'APPROVED_WITH_CHANGES');
});
test('authorized reviewer can reject a pending request without deleting history', async () => {
    const graph = await createGraph();
    const requesterToken = await signToken({ subject: 'reject-owner', personalNumber: '4000007' });
    const created = await requestJson('/api/access-requests', { token: requesterToken, method: 'POST', body: roomRequestBody(graph) });
    const reviewer = await createUser({ subject: 'reject-super', personalNumber: '4000008' });
    await services.membershipRepository.create({ userId: reviewer.user._id, role: ROLES.SUPER_ADMIN, scopeType: SCOPE_TYPES.SYSTEM, scopeId: graph.system._id, systemId: graph.system._id, isActive: true, assignedBy: reviewer.user._id });
    const result = await requestJson(`/api/access-requests/${created.body.data.id}/reject`, { token: reviewer.token, method: 'POST', body: { reviewComment: 'Not approved' } });
    assert.equal(result.body.data.status, 'REJECTED');
    assert.equal(await AccessRequest.countDocuments({ _id: created.body.data.id }), 1);
});
test('requester may cancel only their own pending request', async () => {
    const graph = await createGraph();
    const owner = await signToken({ subject: 'cancel-owner', personalNumber: '4000009' });
    const other = await signToken({ subject: 'cancel-other', personalNumber: '4000010' });
    const created = await requestJson('/api/access-requests', { token: owner, method: 'POST', body: roomRequestBody(graph) });
    const forbidden = await requestJson(`/api/access-requests/${created.body.data.id}/cancel`, { token: other, method: 'POST', body: {} });
    const cancelled = await requestJson(`/api/access-requests/${created.body.data.id}/cancel`, { token: owner, method: 'POST', body: {} });
    assert.equal(forbidden.response.status, 403);
    assert.equal(cancelled.body.data.status, 'CANCELLED');
});
test('non-pending Access Request cannot be approved again', async () => {
    const graph = await createGraph();
    const requesterToken = await signToken({ subject: 'approve-once', personalNumber: '4000011' });
    const created = await requestJson('/api/access-requests', { token: requesterToken, method: 'POST', body: roomRequestBody(graph) });
    const reviewer = await createUser({ subject: 'approve-once-super', personalNumber: '4000012' });
    await services.membershipRepository.create({ userId: reviewer.user._id, role: ROLES.SUPER_ADMIN, scopeType: SCOPE_TYPES.SYSTEM, scopeId: graph.system._id, systemId: graph.system._id, isActive: true, assignedBy: reviewer.user._id });
    const first = await requestJson(`/api/access-requests/${created.body.data.id}/approve`, { token: reviewer.token, method: 'POST', body: approvalBody(graph) });
    const second = await requestJson(`/api/access-requests/${created.body.data.id}/approve`, { token: reviewer.token, method: 'POST', body: approvalBody(graph) });
    assert.equal(first.response.status, 200);
    assert.equal(second.response.status, 409);
});
test('approver listing validates pagination and filters server-side', async () => {
    const graph = await createGraph();
    const reviewer = await createUser({ subject: 'list-super', personalNumber: '4000013' });
    await services.membershipRepository.create({ userId: reviewer.user._id, role: ROLES.SUPER_ADMIN, scopeType: SCOPE_TYPES.SYSTEM, scopeId: graph.system._id, systemId: graph.system._id, isActive: true, assignedBy: reviewer.user._id });
    const invalid = await requestJson('/api/access-requests?page=0', { token: reviewer.token });
    const valid = await requestJson('/api/access-requests?page=1&limit=10', { token: reviewer.token });
    assert.equal(invalid.response.status, 400);
    assert.equal(valid.response.status, 200);
});

test('matching unbound User is bound to verified provider and subject', async () => {
    const identity = authIdentity({ subject: 'bind-new', personalNumber: '5000001' });
    const user = await services.userRepository.create({ personalNumberLookupHash: identity.personalNumberLookupHash, personalNumberLast4: identity.personalNumberLast4, displayName: 'Legacy User', isActive: true });
    const resolved = await services.auth.authenticatedIdentityService.resolveUser(identity);
    assert.equal(String(resolved._id), String(user._id));
    assert.equal(resolved.externalIdentity.subject, 'bind-new');
});
test('matching provider and subject binding resolves the same User', async () => {
    const created = await createUser({ subject: 'bound-match', personalNumber: '5000002' });
    const resolved = await services.auth.authenticatedIdentityService.resolveUser(created.identity);
    assert.equal(String(resolved._id), String(created.user._id));
});
test('conflicting subject for the same personal-number hash is denied', async () => {
    const created = await createUser({ subject: 'subject-original', personalNumber: '5000003' });
    const conflicting = { ...created.identity, subject: 'subject-conflict' };
    await assert.rejects(() => services.auth.authenticatedIdentityService.resolveUser(conflicting), (error) => error.code === 'IDENTITY_BINDING_CONFLICT');
});
test('conflicting provider for the same personal-number hash is denied', async () => {
    const created = await createUser({ subject: 'provider-original', personalNumber: '5000004' });
    const conflicting = { ...created.identity, provider: 'other-sso' };
    await assert.rejects(() => services.auth.authenticatedIdentityService.resolveUser(conflicting), (error) => error.code === 'IDENTITY_BINDING_CONFLICT');
});
test('one external subject cannot bind to two Users', async () => {
    const first = await createUser({ subject: 'unique-subject', personalNumber: '5000005' });
    const secondIdentity = authIdentity({ subject: 'unique-subject', personalNumber: '5000006' });
    await services.userRepository.create({ personalNumberLookupHash: secondIdentity.personalNumberLookupHash, personalNumberLast4: secondIdentity.personalNumberLast4, displayName: 'Second', isActive: true });
    await assert.rejects(() => services.auth.authenticatedIdentityService.resolveUser(secondIdentity), (error) => error.code === 'IDENTITY_BINDING_CONFLICT');
    assert.ok(first.user);
});
test('display-name and email changes do not create another User', async () => {
    const created = await createUser({ subject: 'profile-change', personalNumber: '5000007' });
    const changed = { ...created.identity, displayName: 'Changed Name', email: 'changed@example.com' };
    const resolved = await services.auth.authenticatedIdentityService.resolveUser(changed);
    assert.equal(String(resolved._id), String(created.user._id));
    assert.equal(await User.countDocuments({}), 1);
});
