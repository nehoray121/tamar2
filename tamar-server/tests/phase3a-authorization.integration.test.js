const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const { ORGANIZATION_ENTITY_TYPES } = require('../src/domain/organization/constants.js');
const AccessRequestRepository = require('../src/repositories/AccessRequestRepository.js');
const OrganizationMembershipRepository = require('../src/repositories/OrganizationMembershipRepository.js');
const UserRepository = require('../src/repositories/UserRepository.js');
const AccessRequestApprovalPolicy = require('../src/services/accessRequests/AccessRequestApprovalPolicy.js');
const AccessRequestService = require('../src/services/accessRequests/AccessRequestService.js');
const AuthorizationService = require('../src/services/authorization/AuthorizationService.js');
const HierarchyIntegrityService = require('../src/services/authorization/HierarchyIntegrityService.js');
const ScopeResolver = require('../src/services/authorization/ScopeResolver.js');
const MembershipService = require('../src/services/memberships/MembershipService.js');
const ProtectedRoleAssignmentService = require('../src/services/memberships/ProtectedRoleAssignmentService.js');
const createOrganizationServices = require('../src/services/organization/createOrganizationServices.js');
const {
    clearTestCollections,
    connectTestDatabase,
    dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { identitySnapshot, protectedIdentity } = require('./helpers/identityFixture.js');

let identityCounter = 0;
const actorId = () => new mongoose.Types.ObjectId();
const assertCode = async (operation, code) => {
    await assert.rejects(operation, (error) => {
        assert.equal(error.code, code);
        return true;
    });
};

const createUser = async (userRepository, overrides = {}) => {
    identityCounter += 1;
    return userRepository.create({
        ...protectedIdentity(`subject-${identityCounter}`, { provider: 'phase3a-test', displayName: `Test User ${identityCounter}` }),
        isActive: true,
        ...overrides
    });
};

const setup = () => {
    const organization = createOrganizationServices();
    const hierarchyIntegrityService = new HierarchyIntegrityService({
        hierarchyRepository: organization.hierarchyAdapter
    });
    const userRepository = new UserRepository();
    const membershipRepository = new OrganizationMembershipRepository();
    const accessRequestRepository = new AccessRequestRepository();
    const scopeResolver = new ScopeResolver({ userRepository, membershipRepository, hierarchyIntegrityService });
    const authorizationService = new AuthorizationService({ scopeResolver });
    const approvalPolicy = new AccessRequestApprovalPolicy({ scopeResolver, hierarchyIntegrityService });
    const accessRequestService = new AccessRequestService({
        userRepository,
        membershipRepository,
        accessRequestRepository,
        hierarchyIntegrityService,
        approvalPolicy
    });
    const membershipService = new MembershipService({
        userRepository, membershipRepository, hierarchyIntegrityService, authorizationService
    });
    const protectedRoleAssignmentService = new ProtectedRoleAssignmentService({
        userRepository, membershipRepository, scopeResolver, hierarchyIntegrityService
    });
    return {
        organization,
        hierarchyIntegrityService,
        userRepository,
        membershipRepository,
        accessRequestRepository,
        scopeResolver,
        accessRequestService,
        membershipService,
        protectedRoleAssignmentService
    };
};

const createGraph = async (context) => {
    const { managementService } = context.organization;
    const system = await managementService.createSystem({ key: 'main-system', name: 'Main System' });
    const environment = await managementService.createEnvironment({ systemId: system._id, key: 'main-env', name: 'Main' });
    const subA = await managementService.createSubEnvironment({
        systemId: system._id, environmentId: environment._id, key: 'sub-a', name: 'Sub A'
    });
    const subB = await managementService.createSubEnvironment({
        systemId: system._id, environmentId: environment._id, key: 'sub-b', name: 'Sub B'
    });
    const roomA = await managementService.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subA._id, key: 'room-a', name: 'Room A'
    });
    const roomA2 = await managementService.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subA._id, key: 'room-a2', name: 'Room A2'
    });
    const roomB = await managementService.createRoom({
        systemId: system._id, environmentId: environment._id, subEnvironmentId: subB._id, key: 'room-b', name: 'Room B'
    });
    const otherSystem = await managementService.createSystem({ key: 'other-system', name: 'Other' });
    const otherEnvironment = await managementService.createEnvironment({
        systemId: otherSystem._id, key: 'other-env', name: 'Other Env'
    });
    const otherSub = await managementService.createSubEnvironment({
        systemId: otherSystem._id, environmentId: otherEnvironment._id, key: 'other-sub', name: 'Other Sub'
    });
    const otherRoom = await managementService.createRoom({
        systemId: otherSystem._id,
        environmentId: otherEnvironment._id,
        subEnvironmentId: otherSub._id,
        key: 'other-room',
        name: 'Other Room'
    });
    return {
        system, environment, subA, subB, roomA, roomA2, roomB,
        otherSystem, otherEnvironment, otherSub, otherRoom
    };
};

const roomScope = (graph, room = graph.roomA, overrides = {}) => ({
    scopeType: SCOPE_TYPES.ROOM,
    scopeId: room._id,
    systemId: graph.system._id,
    environmentId: graph.environment._id,
    subEnvironmentId: room.subEnvironmentId,
    roomId: room._id,
    ...overrides
});

const subScope = (graph, sub = graph.subA, overrides = {}) => ({
    scopeType: SCOPE_TYPES.SUB_ENVIRONMENT,
    scopeId: sub._id,
    systemId: graph.system._id,
    environmentId: graph.environment._id,
    subEnvironmentId: sub._id,
    ...overrides
});

const requestPayload = (user, role, scope) => ({
    requesterUserId: user._id,
    requesterIdentitySnapshot: identitySnapshot(user),
    requestedRole: role,
    requestedScopeType: scope.scopeType,
    requestedScopeId: scope.scopeId,
    systemId: scope.systemId,
    environmentId: scope.environmentId,
    subEnvironmentId: scope.subEnvironmentId,
    roomId: scope.roomId,
    reason: 'Phase 3A integration test'
});

before(connectTestDatabase);
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('SYSTEM_ADMIN receives only active descendant rooms, not sibling rooms', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    await context.membershipRepository.create({
        userId: user._id, role: ROLES.SYSTEM_ADMIN, ...subScope(graph), isActive: true
    });
    const access = await context.scopeResolver.resolveEffectiveAccess(user._id);
    assert.deepEqual(new Set(access.roomIds), new Set([String(graph.roomA._id), String(graph.roomA2._id)]));
    assert.equal(access.roomIds.includes(String(graph.roomB._id)), false);
});

test('ROOM_MANAGER and ROOM_USER receive only their assigned active Room', async () => {
    for (const role of [ROLES.ROOM_MANAGER, ROLES.ROOM_USER]) {
        const context = setup();
        const graph = await createGraph(context);
        const user = await createUser(context.userRepository);
        await context.membershipRepository.create({ userId: user._id, role, ...roomScope(graph), isActive: true });
        const access = await context.scopeResolver.resolveEffectiveAccess(user._id);
        assert.deepEqual(access.roomIds, [String(graph.roomA._id)]);
        await clearTestCollections();
    }
});

test('Multiple valid memberships merge and duplicate scope IDs are removed', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    await context.membershipRepository.create({
        userId: user._id, role: ROLES.ROOM_MANAGER, ...roomScope(graph), isActive: true
    });
    await context.membershipRepository.create({
        userId: user._id, role: ROLES.ROOM_USER, ...roomScope(graph), isActive: true
    });
    const access = await context.scopeResolver.resolveEffectiveAccess(user._id);
    assert.deepEqual(access.roomIds, [String(graph.roomA._id)]);
    assert.equal(access.memberships.length, 2);
});

test('Parent deactivation removes descendant access and reactivation restores it', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    await context.membershipRepository.create({
        userId: user._id, role: ROLES.ROOM_USER, ...roomScope(graph), isActive: true
    });
    assert.equal((await context.scopeResolver.resolveEffectiveAccess(user._id)).roomIds.length, 1);
    await context.organization.lifecycleService.deactivateEntity(
        ORGANIZATION_ENTITY_TYPES.ENVIRONMENT, graph.environment._id, actorId()
    );
    assert.equal((await context.scopeResolver.resolveEffectiveAccess(user._id)).roomIds.length, 0);
    await context.organization.lifecycleService.reactivateEntity(
        ORGANIZATION_ENTITY_TYPES.ENVIRONMENT, graph.environment._id, actorId()
    );
    assert.equal((await context.scopeResolver.resolveEffectiveAccess(user._id)).roomIds.length, 1);
});

test('Inactive or archived scope grants no effective access', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    await context.membershipRepository.create({
        userId: user._id, role: ROLES.ROOM_USER, ...roomScope(graph), isActive: true
    });
    await context.organization.lifecycleService.archiveEntity(
        ORGANIZATION_ENTITY_TYPES.ROOM, graph.roomA._id, actorId()
    );
    const access = await context.scopeResolver.resolveEffectiveAccess(user._id);
    assert.equal(access.roomIds.length, 0);
    assert.equal(access.memberships.length, 0);
});

test('Missing referenced scope is ignored without deleting historical membership', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    const missingRoomId = new mongoose.Types.ObjectId();
    const membership = await context.membershipRepository.create({
        userId: user._id,
        role: ROLES.ROOM_USER,
        ...roomScope(graph, graph.roomA, { scopeId: missingRoomId, roomId: missingRoomId }),
        isActive: true
    });
    const access = await context.scopeResolver.resolveEffectiveAccess(user._id);
    assert.equal(access.memberships.length, 0);
    assert.ok(await context.membershipRepository.findActiveById(membership._id));
});

test('Revoked membership remains stored and non-effective', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    const membership = await context.membershipRepository.create({
        userId: user._id, role: ROLES.ROOM_USER, ...roomScope(graph), isActive: true
    });
    await context.membershipRepository.revoke(membership._id, { revokedBy: actorId(), revocationReason: 'Test' });
    assert.equal((await context.scopeResolver.resolveEffectiveAccess(user._id)).roomIds.length, 0);
});

test('ROOM_USER and ROOM_MANAGER Access Requests require a real active Room', async () => {
    for (const role of [ROLES.ROOM_USER, ROLES.ROOM_MANAGER]) {
        const context = setup();
        const graph = await createGraph(context);
        const user = await createUser(context.userRepository);
        const request = await context.accessRequestService.createAccessRequest(
            requestPayload(user, role, roomScope(graph))
        );
        assert.equal(String(request.requestedScopeId), String(graph.roomA._id));
        await clearTestCollections();
    }
});

test('SYSTEM_ADMIN Access Request requires a real active SubEnvironment', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    const request = await context.accessRequestService.createAccessRequest(
        requestPayload(user, ROLES.SYSTEM_ADMIN, subScope(graph))
    );
    assert.equal(String(request.requestedScopeId), String(graph.subA._id));
});

test('Access Request rejects inconsistent Room and SubEnvironment lineage', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    await assertCode(
        () => context.accessRequestService.createAccessRequest(requestPayload(
            user,
            ROLES.ROOM_USER,
            roomScope(graph, graph.roomA, { subEnvironmentId: graph.subB._id })
        )),
        'INVALID_SCOPE_HIERARCHY'
    );
    await assertCode(
        () => context.accessRequestService.createAccessRequest(requestPayload(
            user,
            ROLES.SYSTEM_ADMIN,
            subScope(graph, graph.subA, { environmentId: graph.otherEnvironment._id })
        )),
        'INVALID_SCOPE_HIERARCHY'
    );
});

test('Access Request rejects inactive, archived and cross-System scopes', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    await context.organization.lifecycleService.deactivateEntity(
        ORGANIZATION_ENTITY_TYPES.ROOM, graph.roomA._id, actorId()
    );
    await assertCode(
        () => context.accessRequestService.createAccessRequest(requestPayload(user, ROLES.ROOM_USER, roomScope(graph))),
        'INVALID_SCOPE_HIERARCHY'
    );
    await context.organization.lifecycleService.reactivateEntity(
        ORGANIZATION_ENTITY_TYPES.ROOM, graph.roomA._id, actorId()
    );
    await context.organization.lifecycleService.archiveEntity(
        ORGANIZATION_ENTITY_TYPES.ROOM, graph.roomA._id, actorId()
    );
    await assertCode(
        () => context.accessRequestService.createAccessRequest(requestPayload(user, ROLES.ROOM_USER, roomScope(graph))),
        'INVALID_SCOPE_HIERARCHY'
    );
    const crossSystemScope = roomScope(graph, graph.otherRoom, {
        scopeId: graph.otherRoom._id,
        roomId: graph.otherRoom._id,
        subEnvironmentId: graph.otherSub._id
    });
    await assertCode(
        () => context.accessRequestService.createAccessRequest(requestPayload(user, ROLES.ROOM_USER, crossSystemScope)),
        'INVALID_SCOPE_HIERARCHY'
    );
});

test('Duplicate pending request remains prevented and SUPER_ADMIN remains forbidden', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const user = await createUser(context.userRepository);
    const payload = requestPayload(user, ROLES.ROOM_USER, roomScope(graph));
    await context.accessRequestService.createAccessRequest(payload);
    await assertCode(() => context.accessRequestService.createAccessRequest(payload), 'ACCESS_REQUEST_DUPLICATE');
    await assertCode(
        () => context.accessRequestService.createAccessRequest({
            ...payload,
            requestedRole: ROLES.SUPER_ADMIN,
            requestedScopeType: SCOPE_TYPES.SYSTEM,
            requestedScopeId: graph.system._id,
            environmentId: undefined,
            subEnvironmentId: undefined,
            roomId: undefined
        }),
        'VALIDATION_ERROR'
    );
});

test('MembershipService validates real active scopes for room and sub-environment roles', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const actor = await createUser(context.userRepository);
    const roomUser = await createUser(context.userRepository);
    const roomManager = await createUser(context.userRepository);
    const systemAdmin = await createUser(context.userRepository);
    await context.membershipRepository.create({
        userId: actor._id,
        role: ROLES.SUPER_ADMIN,
        scopeType: SCOPE_TYPES.SYSTEM,
        scopeId: graph.system._id,
        systemId: graph.system._id,
        isActive: true
    });
    assert.equal((await context.membershipService.assignRole({
        actorUserId: actor._id, targetUserId: roomUser._id, role: ROLES.ROOM_USER, scope: roomScope(graph)
    })).role, ROLES.ROOM_USER);
    assert.equal((await context.membershipService.assignRole({
        actorUserId: actor._id, targetUserId: roomManager._id, role: ROLES.ROOM_MANAGER, scope: roomScope(graph)
    })).role, ROLES.ROOM_MANAGER);
    assert.equal((await context.membershipService.assignRole({
        actorUserId: actor._id, targetUserId: systemAdmin._id, role: ROLES.SYSTEM_ADMIN, scope: subScope(graph)
    })).role, ROLES.SYSTEM_ADMIN);
});

test('Protected SUPER_ADMIN assignment requires a real active System in actor authority', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const actor = await createUser(context.userRepository);
    const target = await createUser(context.userRepository);
    await context.membershipRepository.create({
        userId: actor._id,
        role: ROLES.SUPER_ADMIN,
        scopeType: SCOPE_TYPES.SYSTEM,
        scopeId: graph.system._id,
        systemId: graph.system._id,
        isActive: true
    });
    const membership = await context.protectedRoleAssignmentService.assignSuperAdmin({
        actorUserId: actor._id, targetUserId: target._id, systemId: graph.system._id
    });
    assert.equal(membership.role, ROLES.SUPER_ADMIN);
    const otherTarget = await createUser(context.userRepository);
    await assertCode(
        () => context.protectedRoleAssignmentService.assignSuperAdmin({
            actorUserId: actor._id, targetUserId: otherTarget._id, systemId: graph.otherSystem._id
        }),
        'SUPER_ADMIN_ASSIGNMENT_FORBIDDEN'
    );
});

test('Membership assignment rejects inconsistent lineage and inactive parent chain', async () => {
    const context = setup();
    const graph = await createGraph(context);
    const actor = await createUser(context.userRepository);
    const target = await createUser(context.userRepository);
    await context.membershipRepository.create({
        userId: actor._id,
        role: ROLES.SUPER_ADMIN,
        scopeType: SCOPE_TYPES.SYSTEM,
        scopeId: graph.system._id,
        systemId: graph.system._id,
        isActive: true
    });
    await assertCode(
        () => context.membershipService.assignRole({
            actorUserId: actor._id,
            targetUserId: target._id,
            role: ROLES.ROOM_USER,
            scope: roomScope(graph, graph.roomA, { environmentId: graph.otherEnvironment._id })
        }),
        'INVALID_SCOPE_HIERARCHY'
    );
    await context.organization.lifecycleService.deactivateEntity(
        ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT, graph.subA._id, actorId()
    );
    await assertCode(
        () => context.membershipService.assignRole({
            actorUserId: actor._id, targetUserId: target._id, role: ROLES.ROOM_USER, scope: roomScope(graph)
        }),
        'INVALID_SCOPE_HIERARCHY'
    );
});
