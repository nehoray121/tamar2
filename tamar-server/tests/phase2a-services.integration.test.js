const test = require('node:test');
const { after, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
    ACCESS_REQUEST_STATUSES,
    ACCESS_REQUEST_TYPES,
    ROLES,
    SCOPE_TYPES
} = require('../src/domain/access/constants.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const UserRepository = require('../src/repositories/UserRepository.js');
const OrganizationMembershipRepository = require('../src/repositories/OrganizationMembershipRepository.js');
const AccessRequestRepository = require('../src/repositories/AccessRequestRepository.js');
const ScopeResolver = require('../src/services/authorization/ScopeResolver.js');
const AccessRequestApprovalPolicy = require('../src/services/accessRequests/AccessRequestApprovalPolicy.js');
const AccessRequestService = require('../src/services/accessRequests/AccessRequestService.js');
const { createHierarchyFixture, roomScope } = require('./helpers/hierarchyFixture.js');
const {
    clearTestCollections,
    connectTestDatabase,
    dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { identitySnapshot, protectedIdentity } = require('./helpers/identityFixture.js');

const userRepository = new UserRepository();
const membershipRepository = new OrganizationMembershipRepository();
const accessRequestRepository = new AccessRequestRepository();

const createUser = (subject) => userRepository.create({
    ...protectedIdentity(subject),
    isActive: true
});

before(connectTestDatabase);
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('revoked membership is excluded by the real repository and grants no effective access', async () => {
    const hierarchy = createHierarchyFixture();
    const user = await createUser('revoked-resolver');
    const membership = await membershipRepository.create({
        userId: user._id,
        role: ROLES.ROOM_USER,
        ...roomScope(hierarchy.ids),
        isActive: true,
        assignedBy: new mongoose.Types.ObjectId()
    });
    await membershipRepository.revoke(membership._id, {
        revokedBy: new mongoose.Types.ObjectId(),
        revocationReason: 'No longer authorized'
    });

    const resolver = new ScopeResolver({
        userRepository,
        membershipRepository,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const access = await resolver.resolveEffectiveAccess(user._id);
    assert.deepEqual(access.memberships, []);
    assert.deepEqual(access.roomIds, []);
});

test('Access Request service approves ROOM_MANAGER as ROOM_USER atomically', async () => {
    const hierarchy = createHierarchyFixture();
    const requester = await createUser('requester-service');
    const reviewer = await createUser('reviewer-service');
    await membershipRepository.create({
        userId: reviewer._id,
        role: ROLES.SUPER_ADMIN,
        scopeType: SCOPE_TYPES.SYSTEM,
        scopeId: hierarchy.ids.system,
        systemId: hierarchy.ids.system,
        isActive: true,
        assignedBy: reviewer._id
    });

    const scopeResolver = new ScopeResolver({
        userRepository,
        membershipRepository,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const approvalPolicy = new AccessRequestApprovalPolicy({
        scopeResolver,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService
    });
    const service = new AccessRequestService({
        userRepository,
        membershipRepository,
        accessRequestRepository,
        hierarchyIntegrityService: hierarchy.hierarchyIntegrityService,
        approvalPolicy
    });
    const scope = roomScope(hierarchy.ids);
    const request = await service.createAccessRequest({
        requesterUserId: requester._id,
        requesterIdentitySnapshot: identitySnapshot(requester),
        requestType: ACCESS_REQUEST_TYPES.INITIAL_ACCESS,
        requestedRole: ROLES.ROOM_MANAGER,
        requestedScopeType: scope.scopeType,
        requestedScopeId: scope.scopeId,
        systemId: scope.systemId,
        environmentId: scope.environmentId,
        subEnvironmentId: scope.subEnvironmentId,
        roomId: scope.roomId
    });
    const approved = await service.approveAccessRequest({
        requestId: request._id,
        reviewerUserId: reviewer._id,
        approvedRole: ROLES.ROOM_USER,
        approvedScope: scope,
        reviewComment: 'Approved with least privilege'
    });

    assert.equal(approved.status, ACCESS_REQUEST_STATUSES.APPROVED_WITH_CHANGES);
    assert.equal(approved.approvedRole, ROLES.ROOM_USER);
    const membership = await OrganizationMembership.findById(approved.createdMembershipId).lean();
    assert.equal(membership.role, ROLES.ROOM_USER);
    assert.equal(String(membership.scopeId), String(scope.scopeId));
});
