const mongoose = require('mongoose');
const AppError = require('../../errors/AppError.js');
const { ACCESS_REQUEST_STATUSES, ACCESS_REQUEST_TYPES } = require('../../domain/access/constants.js');
const { assertRequestRoleScopeCompatibility, normalizeExternalIdentity } = require('../../domain/access/validators.js');

const requesterKeyFor = ({ requesterIdentitySnapshot }) => `identity:${requesterIdentitySnapshot.personalNumberLookupHash}`;
const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const identityTarget = (snapshot, userId) => ({ identity: { provider: snapshot.provider, subject: snapshot.subject }, userId: userId ? String(userId) : undefined });
const bindingMatches = (user, snapshot) => user.externalIdentity?.provider === snapshot.provider
    && user.externalIdentity?.subject === snapshot.subject
    && user.personalNumberLookupHash === snapshot.personalNumberLookupHash;

class AccessRequestService {
    constructor({ userRepository, membershipRepository, accessRequestRepository, hierarchyIntegrityService, approvalPolicy, scopeResolver, realtimePublisher }) {
        Object.assign(this, { userRepository, membershipRepository, accessRequestRepository, hierarchyIntegrityService, approvalPolicy, scopeResolver, realtimePublisher });
    }

    async createAccessRequest(payload) {
        assertRequestRoleScopeCompatibility(payload.requestedRole, payload.requestedScopeType);
        normalizeExternalIdentity(payload.requesterIdentitySnapshot);
        if (!/^[a-f0-9]{64}$/.test(payload.requesterIdentitySnapshot.personalNumberLookupHash || '')) {
            throw new AppError({ statusCode: 400, code: 'IDENTITY_CLAIMS_INVALID', message: 'Protected requester identity is missing' });
        }
        if (payload.requesterUserId) {
            const requester = await this.userRepository.findActiveById(payload.requesterUserId);
            if (!requester) throw new AppError({ statusCode: 403, code: 'USER_DISABLED', message: 'Requester is not active' });
        }
        const canonicalScope = await this.hierarchyIntegrityService.resolveScope({
            role: payload.requestedRole,
            scopeType: payload.requestedScopeType,
            scopeId: payload.requestedScopeId,
            systemId: payload.systemId,
            environmentId: payload.environmentId,
            subEnvironmentId: payload.subEnvironmentId,
            roomId: payload.roomId
        });
        if (payload.requesterUserId) {
            const existing = await this.membershipRepository.findActiveEquivalent({
                userId: payload.requesterUserId,
                role: payload.requestedRole,
                scopeType: canonicalScope.scopeType,
                scopeId: canonicalScope.scopeId
            });
            if (existing) throw new AppError({ statusCode: 409, code: 'ACTIVE_MEMBERSHIP_ALREADY_EXISTS', message: 'Requester already holds this active membership' });
        }
        const equivalent = await this.accessRequestRepository.findPendingEquivalent({
            personalNumberLookupHash: payload.requesterIdentitySnapshot.personalNumberLookupHash,
            requestedRole: payload.requestedRole,
            requestedScopeType: canonicalScope.scopeType,
            requestedScopeId: canonicalScope.scopeId
        });
        if (equivalent) throw new AppError({ statusCode: 409, code: 'ACCESS_REQUEST_DUPLICATE', message: 'An equivalent pending Access Request already exists' });
        const request = await this.accessRequestRepository.create({
            requesterUserId: payload.requesterUserId || null,
            requesterIdentitySnapshot: payload.requesterIdentitySnapshot,
            requesterKey: requesterKeyFor(payload),
            requestType: payload.requestType || ACCESS_REQUEST_TYPES.INITIAL_ACCESS,
            requestedRole: payload.requestedRole,
            requestedScopeType: canonicalScope.scopeType,
            requestedScopeId: canonicalScope.scopeId,
            systemId: canonicalScope.systemId,
            environmentId: canonicalScope.environmentId,
            subEnvironmentId: canonicalScope.subEnvironmentId,
            roomId: canonicalScope.roomId,
            reason: payload.reason
        });
        this.realtimePublisher?.requestCreated(request, identityTarget(payload.requesterIdentitySnapshot, payload.requesterUserId));
        return request;
    }

    async listMyRequests(auth, requesterUserId) {
        return this.accessRequestRepository.listForIdentity({ personalNumberLookupHash: auth.personalNumberLookupHash, requesterUserId });
    }

    async listReviewableRequests(reviewerUserId, filters) {
        const access = await this.scopeResolver.resolveEffectiveAccess(reviewerUserId);
        if (!access.isActive) throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Reviewer is not active' });
        return this.accessRequestRepository.listReviewable(access, filters);
    }

    async approveAccessRequest({ requestId, reviewerUserId, approvedRole, approvedScope, reviewComment }) {
        const session = await mongoose.startSession();
        let result;
        let target;
        try {
            await session.withTransaction(async () => {
                const request = await this.accessRequestRepository.findById(requestId, { session, includeIdentityProtection: true });
                if (!request || request.status !== ACCESS_REQUEST_STATUSES.PENDING) throw new AppError({ statusCode: 409, code: 'ACCESS_REQUEST_NOT_PENDING', message: 'Access Request is not pending' });
                const canonicalScope = await this.approvalPolicy.assertCanReview({ reviewerUserId, accessRequest: request, approvedRole, approvedScope }, { session });
                let requester = request.requesterUserId
                    ? await this.userRepository.findById(request.requesterUserId, { session, includeIdentityProtection: true })
                    : await this.userRepository.findOrCreateFromIdentitySnapshot(request.requesterIdentitySnapshot, { session });
                if (!requester || !requester.isActive) throw new AppError({ statusCode: 409, code: 'USER_DISABLED', message: 'Requester is disabled' });
                if (!bindingMatches(requester, request.requesterIdentitySnapshot)) throw new AppError({ statusCode: 403, code: 'IDENTITY_BINDING_CONFLICT', message: 'Requester identity binding conflicts with the verified request identity' });
                const changed = approvedRole !== request.requestedRole || canonicalScope.scopeType !== request.requestedScopeType || !sameId(canonicalScope.scopeId, request.requestedScopeId);
                const membership = await this.membershipRepository.create({
                    userId: requester._id,
                    role: approvedRole,
                    ...canonicalScope,
                    isActive: true,
                    assignedBy: reviewerUserId
                }, { session });
                result = await this.accessRequestRepository.savePendingDecision(request, {
                    requesterUserId: requester._id,
                    status: changed ? ACCESS_REQUEST_STATUSES.APPROVED_WITH_CHANGES : ACCESS_REQUEST_STATUSES.APPROVED,
                    reviewedBy: reviewerUserId,
                    reviewedAt: new Date(),
                    reviewComment,
                    approvedRole,
                    approvedScopeType: canonicalScope.scopeType,
                    approvedScopeId: canonicalScope.scopeId,
                    createdMembershipId: membership._id
                }, { session });
                target = identityTarget(request.requesterIdentitySnapshot, requester._id);
            });
        } finally { await session.endSession(); }
        this.realtimePublisher?.requestUpdated(result, target);
        this.realtimePublisher?.permissionsUpdated(result, target);
        return result;
    }

    async rejectAccessRequest({ requestId, reviewerUserId, reviewComment }) {
        const request = await this.accessRequestRepository.findById(requestId, { includeIdentityProtection: true });
        if (!request || request.status !== ACCESS_REQUEST_STATUSES.PENDING) throw new AppError({ statusCode: 409, code: 'ACCESS_REQUEST_NOT_PENDING', message: 'Access Request is not pending' });
        await this.approvalPolicy.assertCanReview({ reviewerUserId, accessRequest: request, approvedRole: request.requestedRole, approvedScope: {
            scopeType: request.requestedScopeType, scopeId: request.requestedScopeId, systemId: request.systemId,
            environmentId: request.environmentId, subEnvironmentId: request.subEnvironmentId, roomId: request.roomId
        } });
        const result = await this.accessRequestRepository.savePendingDecision(request, { status: ACCESS_REQUEST_STATUSES.REJECTED, reviewedBy: reviewerUserId, reviewedAt: new Date(), reviewComment });
        this.realtimePublisher?.requestUpdated(result, identityTarget(request.requesterIdentitySnapshot, request.requesterUserId));
        return result;
    }

    async cancelOwnAccessRequest({ requestId, auth, requesterUserId }) {
        const request = await this.accessRequestRepository.findById(requestId, { includeIdentityProtection: true });
        if (!request) throw new AppError({ statusCode: 404, code: 'ACCESS_REQUEST_NOT_FOUND', message: 'Access Request was not found' });
        if (request.status !== ACCESS_REQUEST_STATUSES.PENDING) throw new AppError({ statusCode: 409, code: 'ACCESS_REQUEST_NOT_PENDING', message: 'Access Request is not pending' });
        if (request.requesterIdentitySnapshot.personalNumberLookupHash !== auth.personalNumberLookupHash
            || (request.requesterUserId && requesterUserId && !sameId(request.requesterUserId, requesterUserId))) {
            throw new AppError({ statusCode: 403, code: 'ACCESS_REQUEST_FORBIDDEN', message: 'Only the requester may cancel this Access Request' });
        }
        const result = await this.accessRequestRepository.savePendingDecision(request, { status: ACCESS_REQUEST_STATUSES.CANCELLED });
        this.realtimePublisher?.requestUpdated(result, identityTarget(request.requesterIdentitySnapshot, request.requesterUserId));
        return result;
    }
}

module.exports = AccessRequestService;
module.exports.requesterKeyFor = requesterKeyFor;
