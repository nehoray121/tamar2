const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');
const createApp = require('../src/app.js');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const Environment = require('../src/models/Environment.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');
const { createTestConfig, createVerifier, initializeAuthKeys, signToken } = require('./helpers/authFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let config;
let services;
let server;
let baseUrl;
let counter = 0;

const requestJson = async (path, { token, method = 'GET', body } = {}) => {
    const response = await fetch(baseUrl + path, {
        method,
        headers: {
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { response, body: await response.json() };
};

const createHierarchy = async (suffix = String(++counter)) => {
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: 'hier-system-' + suffix, name: 'System ' + suffix });
    const environment = await management.createEnvironment({
        systemId: system._id, key: 'hier-env-' + suffix, name: 'Environment ' + suffix
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id, environmentId: environment._id,
        key: 'hier-sub-' + suffix, name: 'SubEnvironment ' + suffix
    });
    const room = await management.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subEnvironment._id,
        key: 'hier-room-' + suffix, name: 'Room ' + suffix
    });
    return { system, environment, subEnvironment, room };
};

const createActor = async (hierarchy, role = ROLES.SUPER_ADMIN, suffix) => {
    const actorIndex = ++counter;
    const actorSuffix = suffix || String(actorIndex);
    const subject = 'hierarchy-http-' + actorSuffix;
    const personalNumber = '7' + String(actorIndex).padStart(6, '0');
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    const user = await services.userRepository.create({
        externalIdentity: { provider: config.auth.providerKey, subject },
        personalNumberLookupHash: protectedNumber.lookupHash,
        personalNumberLast4: protectedNumber.last4,
        displayName: 'Hierarchy User ' + actorSuffix,
        isActive: true
    });
    const roomRole = [ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(role);
    const subEnvironmentRole = role === ROLES.SYSTEM_ADMIN;
    const membership = await services.membershipRepository.create({
        userId: user._id,
        role,
        scopeType: roomRole ? SCOPE_TYPES.ROOM : (subEnvironmentRole ? SCOPE_TYPES.SUB_ENVIRONMENT : SCOPE_TYPES.SYSTEM),
        scopeId: roomRole ? hierarchy.room._id : (subEnvironmentRole ? hierarchy.subEnvironment._id : hierarchy.system._id),
        systemId: hierarchy.system._id,
        environmentId: role === ROLES.SUPER_ADMIN ? undefined : hierarchy.environment._id,
        subEnvironmentId: role === ROLES.SUPER_ADMIN ? undefined : hierarchy.subEnvironment._id,
        roomId: roomRole ? hierarchy.room._id : undefined,
        isActive: true,
        assignedBy: user._id
    });
    const token = await signToken({ subject, personalNumber, displayName: 'Hierarchy User ' + actorSuffix });
    return { user, membership, token };
};

test('hierarchy route map and OpenAPI document both canonical authenticated creation endpoints', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const routeSource = fs.readFileSync(path.join(projectRoot, 'src/routes/organizationHierarchy.routes.js'), 'utf8');
    const routeMap = fs.readFileSync(path.join(projectRoot, 'docs/api-route-map.md'), 'utf8');
    const openApi = JSON.parse(fs.readFileSync(path.join(projectRoot, 'docs/openapi/organization-hierarchy-management.yaml'), 'utf8'));
    assert.ok(routeSource.includes("router.post('/environments/:environmentId/sub-environments'"));
    assert.ok(routeSource.includes("router.post('/sub-environments/:subEnvironmentId/rooms'"));
    assert.ok(openApi.paths['/environments/{environmentId}/sub-environments']?.post);
    assert.ok(openApi.paths['/sub-environments/{subEnvironmentId}/rooms']?.post);
    assert.ok(routeMap.includes('| POST | `/api/environments/:environmentId/sub-environments` |'));
    assert.ok(routeMap.includes('| POST | `/api/sub-environments/:subEnvironmentId/rooms` |'));
});

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

test('hierarchy creation endpoints require a verified active Tamar membership', async () => {
    const id = '507f1f77bcf86cd799439011';
    for (const path of ['/api/environments/' + id + '/sub-environments', '/api/sub-environments/' + id + '/rooms']) {
        const result = await requestJson(path, { method: 'POST', body: { name: 'אסור' } });
        assert.equal(result.response.status, 401);
        assert.equal(result.body.error.code, 'AUTHENTICATION_REQUIRED');
    }
});

test('exact-System SUPER_ADMIN capability creates canonical persisted SubEnvironment and Room DTOs', async () => {
    const hierarchy = await createHierarchy();
    const actor = await createActor(hierarchy);
    const auth = await requestJson('/api/auth/me', { token: actor.token });
    assert.equal(auth.response.status, 200);
    assert.deepEqual(auth.body.data.capabilities.organizationHierarchy, {
        canCreateSubEnvironment: true,
        canCreateRoom: true,
        systemIds: [String(hierarchy.system._id)]
    });

    const subCreated = await requestJson('/api/environments/' + hierarchy.environment._id + '/sub-environments', {
        token: actor.token, method: 'POST', body: { name: 'תת סביבה חדשה', description: 'נשמרת בשרת' }
    });
    assert.equal(subCreated.response.status, 201);
    assert.match(subCreated.body.data.id, /^[a-f0-9]{24}$/);
    assert.equal(subCreated.body.data.environmentId, String(hierarchy.environment._id));
    assert.equal(subCreated.body.data.systemId, String(hierarchy.system._id));
    assert.equal(subCreated.body.data.__v, undefined);
    assert.ok(await services.organization.subEnvironmentRepository.findById(subCreated.body.data.id));

    const roomCreated = await requestJson('/api/sub-environments/' + subCreated.body.data.id + '/rooms', {
        token: actor.token, method: 'POST', body: { name: 'חדר חדש', description: 'חדר אמיתי' }
    });
    assert.equal(roomCreated.response.status, 201);
    assert.match(roomCreated.body.data.id, /^[a-f0-9]{24}$/);
    assert.equal(roomCreated.body.data.subEnvironmentId, subCreated.body.data.id);
    assert.equal(roomCreated.body.data.environmentId, String(hierarchy.environment._id));
    assert.ok(await services.organization.roomRepository.findById(roomCreated.body.data.id));
});

test('cross-System SUPER_ADMIN and lower roles cannot create hierarchy entities', async () => {
    const owned = await createHierarchy('owned');
    const foreign = await createHierarchy('foreign');
    const superAdmin = await createActor(owned, ROLES.SUPER_ADMIN, 'super');
    const systemAdmin = await createActor(owned, ROLES.SYSTEM_ADMIN, 'system-admin');
    const roomManager = await createActor(owned, ROLES.ROOM_MANAGER, 'room-manager');

    const crossSystem = await requestJson('/api/environments/' + foreign.environment._id + '/sub-environments', {
        token: superAdmin.token, method: 'POST', body: { name: 'Cross system' }
    });
    assert.equal(crossSystem.response.status, 403);
    assert.equal(crossSystem.body.error.code, 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN');

    for (const actor of [systemAdmin, roomManager]) {
        const result = await requestJson('/api/sub-environments/' + owned.subEnvironment._id + '/rooms', {
            token: actor.token, method: 'POST', body: { name: 'Unauthorized room' }
        });
        assert.equal(result.response.status, 403);
        assert.equal(result.body.error.code, 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN');
    }
});

test('validation, inactive parents and duplicate canonical keys fail without creating extra entities', async () => {
    const hierarchy = await createHierarchy();
    const actor = await createActor(hierarchy);
    const initialCount = await services.organization.subEnvironmentRepository.countActiveByEnvironmentId(hierarchy.environment._id);

    const protectedField = await requestJson('/api/environments/' + hierarchy.environment._id + '/sub-environments', {
        token: actor.token, method: 'POST', body: { name: 'Invalid', environmentId: String(hierarchy.environment._id) }
    });
    assert.equal(protectedField.response.status, 400);
    assert.equal(protectedField.body.error.code, 'VALIDATION_ERROR');

    const first = await requestJson('/api/environments/' + hierarchy.environment._id + '/sub-environments', {
        token: actor.token, method: 'POST', body: { name: 'שם כפול' }
    });
    const duplicate = await requestJson('/api/environments/' + hierarchy.environment._id + '/sub-environments', {
        token: actor.token, method: 'POST', body: { name: 'שם כפול' }
    });
    assert.equal(first.response.status, 201);
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.body.error.code, 'DUPLICATE_SUB_ENVIRONMENT_KEY');

    await Environment.updateOne({ _id: hierarchy.environment._id }, { $set: { isActive: false } });
    const inactive = await requestJson('/api/environments/' + hierarchy.environment._id + '/sub-environments', {
        token: actor.token, method: 'POST', body: { name: 'לא ייווצר' }
    });
    assert.equal(inactive.response.status, 400);
    assert.equal(inactive.body.error.code, 'ORGANIZATION_SCOPE_INACTIVE');
    assert.equal(await services.organization.subEnvironmentRepository.countActiveByEnvironmentId(hierarchy.environment._id), initialCount + 1);
});

test('removing the real MongoDB SUPER_ADMIN membership removes hierarchy capabilities after reauthentication', async () => {
    const hierarchy = await createHierarchy();
    const actor = await createActor(hierarchy);
    const before = await requestJson('/api/auth/me', { token: actor.token });
    assert.equal(before.body.data.capabilities.organizationHierarchy.canCreateRoom, true);

    await OrganizationMembership.updateOne({ _id: actor.membership._id }, {
        $set: { isActive: false, revokedAt: new Date(), revokedBy: actor.user._id }
    });
    const afterAuth = await requestJson('/api/auth/me', { token: actor.token });
    assert.equal(afterAuth.body.data.status, 'ACCESS_REQUIRED');
    assert.equal(afterAuth.body.data.reason, 'NO_ACTIVE_MEMBERSHIPS');
    assert.equal(afterAuth.body.data.capabilities, undefined);

    const denied = await requestJson('/api/sub-environments/' + hierarchy.subEnvironment._id + '/rooms', {
        token: actor.token, method: 'POST', body: { name: 'No longer allowed' }
    });
    assert.equal(denied.response.status, 403);
    assert.equal(denied.body.error.code, 'FORBIDDEN');
});
