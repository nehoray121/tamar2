const test = require('node:test');
const assert = require('node:assert/strict');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const {
    assertApprovedRoleNotHigher,
    assertRequestRoleScopeCompatibility,
    assertRoleScopeCompatibility
} = require('../src/domain/access/validators.js');
const ScopeResolver = require('../src/services/authorization/ScopeResolver.js');
const AccessRequestApprovalPolicy = require('../src/services/accessRequests/AccessRequestApprovalPolicy.js');
const { createHierarchyFixture, roomScope, subEnvironmentScope } = require('./helpers/hierarchyFixture.js');

const makePolicyFixture = ({ actorRole, actorScope, actorActive = true }) => {
    const hierarchy = createHierarchyFixture();
    const actorId = 'actor';
    const users = new Map([[actorId, actorActive ? { _id: actorId, isActive: true } : null]]);
    const memberships = actorRole ? [{ userId: actorId, role: actorRole, isActive: true, ...actorScope(hierarchy.ids) }] : [];
    const userRepository = { findActiveById: async (userId) => users.get(String(userId)) || null };
    const membershipRepository = {
        findActiveByUserId: async (userId) => memberships.filter((item) => String(item.userId) === String(userId) && item.isActive)
    };
    const scopeResolver = new ScopeResolver({
        userRepository,
        membershipRepository,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const policy = new AccessRequestApprovalPolicy({ scopeResolver, hierarchyIntegrityService: hierarchy.hierarchyIntegrityService });
    return { ...hierarchy, actorId, policy };
};

const requestFor = (role, scope) => ({
    requestedRole: role,
    requestedScopeType: scope.scopeType,
    requestedScopeId: scope.scopeId,
    systemId: scope.systemId,
    environmentId: scope.environmentId,
    subEnvironmentId: scope.subEnvironmentId,
    roomId: scope.roomId
});

test('SUPER_ADMIN cannot be requested', () => {
    assert.throws(() => assertRequestRoleScopeCompatibility(ROLES.SUPER_ADMIN, SCOPE_TYPES.SYSTEM), /cannot be requested/);
});

test('deprecated and undefined roles are rejected', () => {
    for (const role of ['environment_admin', 'sub_environment_admin', 'room_admin', 'UNKNOWN']) {
        assert.throws(() => assertRoleScopeCompatibility(role, SCOPE_TYPES.ROOM), /Unknown role/);
    }
});

test('ROOM_USER requires ROOM scope', () => {
    assert.doesNotThrow(() => assertRequestRoleScopeCompatibility(ROLES.ROOM_USER, SCOPE_TYPES.ROOM));
    assert.throws(() => assertRequestRoleScopeCompatibility(ROLES.ROOM_USER, SCOPE_TYPES.SUB_ENVIRONMENT), /not compatible/);
});

test('ROOM_MANAGER requires ROOM scope', () => {
    assert.doesNotThrow(() => assertRequestRoleScopeCompatibility(ROLES.ROOM_MANAGER, SCOPE_TYPES.ROOM));
    assert.throws(() => assertRequestRoleScopeCompatibility(ROLES.ROOM_MANAGER, SCOPE_TYPES.SUB_ENVIRONMENT), /not compatible/);
});

test('SYSTEM_ADMIN requires SUB_ENVIRONMENT scope', () => {
    assert.doesNotThrow(() => assertRequestRoleScopeCompatibility(ROLES.SYSTEM_ADMIN, SCOPE_TYPES.SUB_ENVIRONMENT));
    assert.throws(() => assertRequestRoleScopeCompatibility(ROLES.SYSTEM_ADMIN, SCOPE_TYPES.ROOM), /not compatible/);
});

test('ROOM_MANAGER cannot approve a ROOM_MANAGER request', async () => {
    const fixture = makePolicyFixture({ actorRole: ROLES.ROOM_MANAGER, actorScope: roomScope });
    const scope = roomScope(fixture.ids);
    await assert.rejects(
        fixture.policy.assertCanReview({ reviewerUserId: fixture.actorId, accessRequest: requestFor(ROLES.ROOM_MANAGER, scope), approvedRole: ROLES.ROOM_MANAGER, approvedScope: scope }),
        /not authorized/
    );
});

test('ROOM_MANAGER may approve ROOM_USER only for the managed room', async () => {
    const fixture = makePolicyFixture({ actorRole: ROLES.ROOM_MANAGER, actorScope: roomScope });
    const scope = roomScope(fixture.ids);
    await assert.doesNotReject(() => fixture.policy.assertCanReview({
        reviewerUserId: fixture.actorId,
        accessRequest: requestFor(ROLES.ROOM_USER, scope),
        approvedRole: ROLES.ROOM_USER,
        approvedScope: scope
    }));

    const otherScope = roomScope(fixture.ids, { scopeId: fixture.ids.roomB, roomId: fixture.ids.roomB });
    await assert.rejects(() => fixture.policy.assertCanReview({
        reviewerUserId: fixture.actorId,
        accessRequest: requestFor(ROLES.ROOM_USER, otherScope),
        approvedRole: ROLES.ROOM_USER,
        approvedScope: otherScope
    }), /not authorized/);
});

test('SYSTEM_ADMIN may approve ROOM_USER and ROOM_MANAGER in a descendant room', async () => {
    const fixture = makePolicyFixture({ actorRole: ROLES.SYSTEM_ADMIN, actorScope: subEnvironmentScope });
    const scope = roomScope(fixture.ids);
    for (const role of [ROLES.ROOM_USER, ROLES.ROOM_MANAGER]) {
        await assert.doesNotReject(() => fixture.policy.assertCanReview({
            reviewerUserId: fixture.actorId,
            accessRequest: requestFor(role, scope),
            approvedRole: role,
            approvedScope: scope
        }));
    }
});

test('SYSTEM_ADMIN cannot approve SYSTEM_ADMIN', async () => {
    const fixture = makePolicyFixture({ actorRole: ROLES.SYSTEM_ADMIN, actorScope: subEnvironmentScope });
    const scope = subEnvironmentScope(fixture.ids);
    await assert.rejects(() => fixture.policy.assertCanReview({
        reviewerUserId: fixture.actorId,
        accessRequest: requestFor(ROLES.SYSTEM_ADMIN, scope),
        approvedRole: ROLES.SYSTEM_ADMIN,
        approvedScope: scope
    }), /SUPER_ADMIN approval/);
});

test('SUPER_ADMIN may approve SYSTEM_ADMIN', async () => {
    const fixture = makePolicyFixture({
        actorRole: ROLES.SUPER_ADMIN,
        actorScope: (ids) => ({ scopeType: SCOPE_TYPES.SYSTEM, scopeId: ids.system, systemId: ids.system })
    });
    const scope = subEnvironmentScope(fixture.ids);
    await assert.doesNotReject(() => fixture.policy.assertCanReview({
        reviewerUserId: fixture.actorId,
        accessRequest: requestFor(ROLES.SYSTEM_ADMIN, scope),
        approvedRole: ROLES.SYSTEM_ADMIN,
        approvedScope: scope
    }));
});

test('reviewer cannot approve outside their organizational scope', async () => {
    const fixture = makePolicyFixture({ actorRole: ROLES.SYSTEM_ADMIN, actorScope: subEnvironmentScope });
    const outside = roomScope(fixture.ids, {
        scopeId: fixture.ids.roomOutside,
        environmentId: fixture.ids.environmentB,
        subEnvironmentId: fixture.ids.subEnvironmentB,
        roomId: fixture.ids.roomOutside
    });
    await assert.rejects(() => fixture.policy.assertCanReview({
        reviewerUserId: fixture.actorId,
        accessRequest: requestFor(ROLES.ROOM_USER, outside),
        approvedRole: ROLES.ROOM_USER,
        approvedScope: outside
    }), /not authorized/);
});

test('approval may lower role but cannot raise it or grant SUPER_ADMIN', () => {
    assert.doesNotThrow(() => assertApprovedRoleNotHigher(ROLES.ROOM_MANAGER, ROLES.ROOM_USER));
    assert.throws(() => assertApprovedRoleNotHigher(ROLES.ROOM_USER, ROLES.ROOM_MANAGER), /cannot exceed/);
    assert.throws(() => assertApprovedRoleNotHigher(ROLES.SYSTEM_ADMIN, ROLES.SUPER_ADMIN), /cannot be requested/);
});

test('SYSTEM_ADMIN request may be lowered only to a room in the requested sub-environment', async () => {
    const fixture = makePolicyFixture({
        actorRole: ROLES.SUPER_ADMIN,
        actorScope: (ids) => ({ scopeType: SCOPE_TYPES.SYSTEM, scopeId: ids.system, systemId: ids.system })
    });
    const requested = subEnvironmentScope(fixture.ids);
    await assert.doesNotReject(() => fixture.policy.assertCanReview({
        reviewerUserId: fixture.actorId,
        accessRequest: requestFor(ROLES.SYSTEM_ADMIN, requested),
        approvedRole: ROLES.ROOM_MANAGER,
        approvedScope: roomScope(fixture.ids)
    }));

    const outside = roomScope(fixture.ids, {
        scopeId: fixture.ids.roomOutside,
        environmentId: fixture.ids.environmentB,
        subEnvironmentId: fixture.ids.subEnvironmentB,
        roomId: fixture.ids.roomOutside
    });
    await assert.rejects(() => fixture.policy.assertCanReview({
        reviewerUserId: fixture.actorId,
        accessRequest: requestFor(ROLES.SYSTEM_ADMIN, requested),
        approvedRole: ROLES.ROOM_MANAGER,
        approvedScope: outside
    }), /requested sub-environment/);
});
