const AppError = require('../../errors/AppError.js');
const { ROLES, SCOPE_TYPES } = require('../../domain/access/constants.js');
const {
    assertApprovedRoleNotHigher,
    assertRequestRoleScopeCompatibility
} = require('../../domain/access/validators.js');

const forbidden = (message = 'Reviewer is not authorized for this Access Request') => new AppError({
    statusCode: 403,
    code: 'ACCESS_REQUEST_REVIEW_FORBIDDEN',
    message
});

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class AccessRequestApprovalPolicy {
    constructor({ scopeResolver, hierarchyIntegrityService }) {
        this.scopeResolver = scopeResolver;
        this.hierarchyIntegrityService = hierarchyIntegrityService;
    }

    async assertCanReview({ reviewerUserId, accessRequest, approvedRole, approvedScope }, options = {}) {
        assertRequestRoleScopeCompatibility(accessRequest.requestedRole, accessRequest.requestedScopeType);
        assertRequestRoleScopeCompatibility(approvedRole, approvedScope.scopeType);
        assertApprovedRoleNotHigher(accessRequest.requestedRole, approvedRole);

        const canonicalApprovedScope = await this.hierarchyIntegrityService.resolveScope({
            role: approvedRole,
            scopeType: approvedScope.scopeType,
            scopeId: approvedScope.scopeId,
            systemId: approvedScope.systemId,
            environmentId: approvedScope.environmentId,
            subEnvironmentId: approvedScope.subEnvironmentId,
            roomId: approvedScope.roomId
        }, options);

        this.assertDecisionIsWithinRequest(accessRequest, approvedRole, canonicalApprovedScope);

        const reviewerAccess = await this.scopeResolver.resolveEffectiveAccess(reviewerUserId, options);
        if (!reviewerAccess.isActive) throw forbidden('Inactive reviewer cannot review Access Requests');
        if (reviewerAccess.global && reviewerAccess.systemIds.includes(String(accessRequest.systemId))) {
            return canonicalApprovedScope;
        }

        if (accessRequest.requestedRole === ROLES.SYSTEM_ADMIN) {
            throw forbidden('SYSTEM_ADMIN requests require SUPER_ADMIN approval');
        }

        const parentSubEnvironmentId = accessRequest.subEnvironmentId;
        const systemAdminCanApprove = reviewerAccess.memberships.some((membership) => (
            membership.role === ROLES.SYSTEM_ADMIN
            && sameId(membership.subEnvironmentId, parentSubEnvironmentId)
        ));
        if (systemAdminCanApprove) return canonicalApprovedScope;

        const roomManagerCanApprove = accessRequest.requestedRole === ROLES.ROOM_USER
            && approvedRole === ROLES.ROOM_USER
            && reviewerAccess.memberships.some((membership) => (
                membership.role === ROLES.ROOM_MANAGER
                && membership.scopeType === SCOPE_TYPES.ROOM
                && sameId(membership.scopeId, accessRequest.requestedScopeId)
                && sameId(membership.scopeId, canonicalApprovedScope.scopeId)
            ));

        if (!roomManagerCanApprove) throw forbidden();
        return canonicalApprovedScope;
    }

    assertDecisionIsWithinRequest(accessRequest, approvedRole, approvedScope) {
        if (accessRequest.requestedRole === ROLES.SYSTEM_ADMIN) {
            if (approvedRole === ROLES.SYSTEM_ADMIN) {
                if (!sameId(approvedScope.scopeId, accessRequest.requestedScopeId)) {
                    throw forbidden('SYSTEM_ADMIN approval must remain on the requested sub-environment');
                }
                return;
            }

            if (!sameId(approvedScope.subEnvironmentId, accessRequest.requestedScopeId)) {
                throw forbidden('Lower room role must belong to the requested sub-environment');
            }
            return;
        }

        if (!sameId(approvedScope.scopeId, accessRequest.requestedScopeId)) {
            throw forbidden('Room request cannot be moved to another room during approval');
        }
    }
}

module.exports = AccessRequestApprovalPolicy;
