const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const { assertRoleScopeCompatibility } = require('../src/domain/access/validators.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const AccessRequest = require('../src/models/AccessRequest.js');
const ScopeResolver = require('../src/services/authorization/ScopeResolver.js');
const AccessRequestApprovalPolicy = require('../src/services/accessRequests/AccessRequestApprovalPolicy.js');
const { createHierarchyFixture, roomScope, subEnvironmentScope } = require('./helpers/hierarchyFixture.js');

const projectRoot = path.resolve(__dirname, '..');

test('SUPER_ADMIN membership requires SYSTEM scope', () => {
    assert.doesNotThrow(() => assertRoleScopeCompatibility(ROLES.SUPER_ADMIN, SCOPE_TYPES.SYSTEM));
    assert.throws(() => assertRoleScopeCompatibility(ROLES.SUPER_ADMIN, SCOPE_TYPES.SUB_ENVIRONMENT), /not compatible/);
});

test('deprecated role values are rejected by both membership and Access Request models', async () => {
    const hierarchy = createHierarchyFixture();
    const scope = roomScope(hierarchy.ids);
    const membership = new OrganizationMembership({
        userId: new mongoose.Types.ObjectId(),
        role: 'room_admin',
        ...scope,
        assignedBy: new mongoose.Types.ObjectId()
    });
    const request = new AccessRequest({
        requesterIdentitySnapshot: { provider: 'test', subject: 'deprecated' },
        requesterKey: 'external:test:deprecated',
        requestType: 'INITIAL_ACCESS',
        requestedRole: 'sub_environment_admin',
        requestedScopeType: SCOPE_TYPES.SUB_ENVIRONMENT,
        requestedScopeId: hierarchy.ids.subEnvironmentA,
        systemId: hierarchy.ids.system,
        environmentId: hierarchy.ids.environmentA,
        subEnvironmentId: hierarchy.ids.subEnvironmentA
    });

    await assert.rejects(() => membership.validate());
    await assert.rejects(() => request.validate());
});

test('unknown role values are rejected by models', async () => {
    const hierarchy = createHierarchyFixture();
    const membership = new OrganizationMembership({
        userId: new mongoose.Types.ObjectId(),
        role: 'UNKNOWN_ROLE',
        ...roomScope(hierarchy.ids),
        assignedBy: new mongoose.Types.ObjectId()
    });
    await assert.rejects(() => membership.validate());
});

test('revoked membership grants no effective access', async () => {
    const hierarchy = createHierarchyFixture();
    const userId = 'revoked-user';
    const resolver = new ScopeResolver({
        userRepository: { findActiveById: async () => ({ _id: userId, isActive: true }) },
        membershipRepository: { findActiveByUserId: async () => [] },
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const access = await resolver.resolveEffectiveAccess(userId);
    assert.deepEqual(access.memberships, []);
    assert.deepEqual(access.roomIds, []);
});

test('duplicate scope IDs are removed when multiple memberships are merged', async () => {
    const hierarchy = createHierarchyFixture();
    const userId = 'multi-role-user';
    const duplicateRoomMemberships = [ROLES.ROOM_USER, ROLES.ROOM_MANAGER].map((role) => ({
        userId,
        role,
        isActive: true,
        ...roomScope(hierarchy.ids)
    }));
    const resolver = new ScopeResolver({
        userRepository: { findActiveById: async () => ({ _id: userId, isActive: true }) },
        membershipRepository: { findActiveByUserId: async () => duplicateRoomMemberships },
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const access = await resolver.resolveEffectiveAccess(userId);
    assert.deepEqual(access.roomIds, [String(hierarchy.ids.roomA)]);
    assert.deepEqual(access.subEnvironmentIds, [String(hierarchy.ids.subEnvironmentA)]);
});

test('authorized SYSTEM_ADMIN may lower ROOM_MANAGER request to ROOM_USER for the same room', async () => {
    const hierarchy = createHierarchyFixture();
    const reviewerUserId = 'system-admin';
    const memberships = [{
        userId: reviewerUserId,
        role: ROLES.SYSTEM_ADMIN,
        isActive: true,
        ...subEnvironmentScope(hierarchy.ids)
    }];
    const scopeResolver = new ScopeResolver({
        userRepository: { findActiveById: async () => ({ _id: reviewerUserId, isActive: true }) },
        membershipRepository: { findActiveByUserId: async () => memberships },
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const policy = new AccessRequestApprovalPolicy({
        scopeResolver,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const scope = roomScope(hierarchy.ids);
    await assert.doesNotReject(() => policy.assertCanReview({
        reviewerUserId,
        accessRequest: {
            requestedRole: ROLES.ROOM_MANAGER,
            requestedScopeType: scope.scopeType,
            requestedScopeId: scope.scopeId,
            systemId: scope.systemId,
            environmentId: scope.environmentId,
            subEnvironmentId: scope.subEnvironmentId,
            roomId: scope.roomId
        },
        approvedRole: ROLES.ROOM_USER,
        approvedScope: scope
    }));
});

test('Socket.IO uses Access Token middleware and exposes no client-controlled room join event', async () => {
    const source = await readFile(path.join(projectRoot, 'src/socket/initializeSocket.js'), 'utf8');
    assert.match(source, /io\.use\s*\(/);
    assert.match(source, /accessTokenVerifier/);
    assert.doesNotMatch(source, /socket\.on\(['"](?:join|subscribe|join-room)/i);
});

test('central API registry mounts Access Request routes with authentication middleware', async () => {
    const [appSource, registrySource, routeSource] = await Promise.all([
        readFile(path.join(projectRoot, 'src/app.js'), 'utf8'),
        readFile(path.join(projectRoot, 'src/routes/index.js'), 'utf8'),
        readFile(path.join(projectRoot, 'src/routes/accessRequests.routes.js'), 'utf8')
    ]);
    assert.match(appSource, /app\.use\('\/api', createApiRouter/);
    assert.match(registrySource, /router\.use\('\/access-requests'/);
    assert.match(routeSource, /router\.use\(authenticateAccessToken\)/);
});

test('central API registry mounts authenticated auth/me infrastructure', async () => {
    const [registrySource, routeSource] = await Promise.all([
        readFile(path.join(projectRoot, 'src/routes/index.js'), 'utf8'),
        readFile(path.join(projectRoot, 'src/routes/auth.routes.js'), 'utf8')
    ]);
    assert.match(registrySource, /createAuthRoutes/);
    assert.match(routeSource, /router\.get\('\/me', authenticateAccessToken/);
});
