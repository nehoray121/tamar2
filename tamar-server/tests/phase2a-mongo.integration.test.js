const test = require('node:test');
const { after, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
    ACCESS_REQUEST_TYPES,
    ROLES
} = require('../src/domain/access/constants.js');
const User = require('../src/models/User.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const AccessRequest = require('../src/models/AccessRequest.js');
const UserRepository = require('../src/repositories/UserRepository.js');
const OrganizationMembershipRepository = require('../src/repositories/OrganizationMembershipRepository.js');
const AccessRequestRepository = require('../src/repositories/AccessRequestRepository.js');
const ScopeResolver = require('../src/services/authorization/ScopeResolver.js');
const { createHierarchyFixture, roomScope, subEnvironmentScope } = require('./helpers/hierarchyFixture.js');
const {
    clearTestCollections,
    connectTestDatabase,
    dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { identitySnapshot, protectedIdentity } = require('./helpers/identityFixture.js');

const userRepository = new UserRepository();
const membershipRepository = new OrganizationMembershipRepository();
const accessRequestRepository = new AccessRequestRepository();

const createUser = (suffix, overrides = {}) => userRepository.create({
    ...protectedIdentity(`subject-${suffix}`, { personalNumber: `number-${suffix}`, displayName: `Test User ${suffix}` }),
    isActive: true,
    ...overrides
});

const membershipPayload = (userId, role, scope, overrides = {}) => ({
    userId,
    role,
    ...scope,
    isActive: true,
    assignedBy: new mongoose.Types.ObjectId(),
    ...overrides
});

const requestPayload = (user, scope, overrides = {}) => ({
    requesterUserId: user._id,
    requesterIdentitySnapshot: identitySnapshot(user),
    requesterKey: `identity:${user.personalNumberLookupHash}`,
    requestType: ACCESS_REQUEST_TYPES.INITIAL_ACCESS,
    requestedRole: ROLES.ROOM_USER,
    requestedScopeType: scope.scopeType,
    requestedScopeId: scope.scopeId,
    systemId: scope.systemId,
    environmentId: scope.environmentId,
    subEnvironmentId: scope.subEnvironmentId,
    roomId: scope.roomId,
    ...overrides
});

before(connectTestDatabase);
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('User has no password or plaintext personal-number fields and protects lookup metadata', async () => {
    const user = await createUser('identity');
    const protectedUser = await User.findById(user._id).select('+personalNumberLookupHash +personalNumberLast4').lean();
    assert.match(protectedUser.personalNumberLookupHash, /^[a-f0-9]{64}$/);
    assert.equal(User.schema.path('identityNumber'), undefined);
    assert.equal(user.toJSON().personalNumberLookupHash, undefined);
    assert.equal(User.schema.path('password'), undefined);
    assert.equal(User.schema.path('passwordHash'), undefined);
});

test('duplicate active membership is rejected by the partial unique index', async () => {
    const hierarchy = createHierarchyFixture();
    const user = await createUser('duplicate-membership');
    const payload = membershipPayload(user._id, ROLES.ROOM_USER, roomScope(hierarchy.ids));
    await membershipRepository.create(payload);
    await assert.rejects(() => membershipRepository.create(payload), (error) => error.code === 'DUPLICATE_ACTIVE_MEMBERSHIP');
});

test('revoked membership is retained and does not block a new active membership', async () => {
    const hierarchy = createHierarchyFixture();
    const user = await createUser('revoked-membership');
    const payload = membershipPayload(user._id, ROLES.ROOM_USER, roomScope(hierarchy.ids));
    const original = await membershipRepository.create(payload);
    await membershipRepository.revoke(original._id, {
        revokedBy: new mongoose.Types.ObjectId(),
        revocationReason: 'Test revocation'
    });
    const replacement = await membershipRepository.create(payload);

    assert.notEqual(String(replacement._id), String(original._id));
    assert.equal(await OrganizationMembership.countDocuments({ userId: user._id }), 2);
    assert.equal(await OrganizationMembership.countDocuments({ userId: user._id, isActive: true }), 1);
});

test('duplicate equivalent pending Access Request is rejected', async () => {
    const hierarchy = createHierarchyFixture();
    const user = await createUser('duplicate-request');
    const payload = requestPayload(user, roomScope(hierarchy.ids));
    await accessRequestRepository.create(payload);
    await assert.rejects(() => accessRequestRepository.create(payload), (error) => error.code === 'ACCESS_REQUEST_DUPLICATE');
    assert.equal(await AccessRequest.countDocuments({}), 1);
});

test('multiple memberships merge and SYSTEM_ADMIN receives descendant rooms', async () => {
    const hierarchy = createHierarchyFixture();
    const user = await createUser('merged-access');
    await membershipRepository.create(membershipPayload(
        user._id,
        ROLES.SYSTEM_ADMIN,
        subEnvironmentScope(hierarchy.ids)
    ));
    await membershipRepository.create(membershipPayload(
        user._id,
        ROLES.ROOM_MANAGER,
        roomScope(hierarchy.ids, {
            scopeId: hierarchy.ids.roomOutside,
            environmentId: hierarchy.ids.environmentB,
            subEnvironmentId: hierarchy.ids.subEnvironmentB,
            roomId: hierarchy.ids.roomOutside
        })
    ));

    const resolver = new ScopeResolver({
        userRepository,
        membershipRepository,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const access = await resolver.resolveEffectiveAccess(user._id);

    assert.deepEqual(new Set(access.roomIds), new Set([
        String(hierarchy.ids.roomA),
        String(hierarchy.ids.roomB),
        String(hierarchy.ids.roomOutside)
    ]));
    assert.deepEqual(new Set(access.subEnvironmentIds), new Set([
        String(hierarchy.ids.subEnvironmentA),
        String(hierarchy.ids.subEnvironmentB)
    ]));
});

test('inactive user receives no effective access even when active memberships exist', async () => {
    const hierarchy = createHierarchyFixture();
    const user = await createUser('inactive-access', { isActive: false });
    await membershipRepository.create(membershipPayload(user._id, ROLES.ROOM_USER, roomScope(hierarchy.ids)));
    const resolver = new ScopeResolver({
        userRepository,
        membershipRepository,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });

    const access = await resolver.resolveEffectiveAccess(user._id);
    assert.equal(access.isActive, false);
    assert.deepEqual(access.memberships, []);
    assert.deepEqual(access.roomIds, []);
});
