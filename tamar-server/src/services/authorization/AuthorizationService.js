const { ROLES, SCOPE_TYPES } = require('../../domain/access/constants.js');
const { assertRoleScopeCompatibility } = require('../../domain/access/validators.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class AuthorizationService {
    constructor({ scopeResolver }) {
        this.scopeResolver = scopeResolver;
    }

    async canAssignRole(actorUserId, role, scope) {
        assertRoleScopeCompatibility(role, scope.scopeType);
        const access = await this.scopeResolver.resolveEffectiveAccess(actorUserId);
        if (!access.isActive) return false;

        if (access.global) {
            return access.systemIds.includes(String(scope.systemId));
        }

        if ([ROLES.SUPER_ADMIN, ROLES.ENVIRONMENT_ADMIN, ROLES.SYSTEM_ADMIN].includes(role)) {
            return false;
        }

        const targetRoomId = String(scope.scopeId);
        if (!access.roomIds.includes(targetRoomId)) return false;

        if (access.memberships.some((membership) => (
            membership.role === ROLES.ENVIRONMENT_ADMIN
            && sameId(membership.environmentId, scope.environmentId)
        ))) {
            return true;
        }

        if (access.memberships.some((membership) => (
            membership.role === ROLES.SYSTEM_ADMIN
            && sameId(membership.subEnvironmentId, scope.subEnvironmentId)
        ))) {
            return true;
        }

        return role === ROLES.ROOM_USER && access.memberships.some((membership) => (
            membership.role === ROLES.ROOM_MANAGER
            && membership.scopeType === SCOPE_TYPES.ROOM
            && sameId(membership.scopeId, targetRoomId)
        ));
    }

    async canManageMembership(actorUserId, targetMembership) {
        return this.canAssignRole(actorUserId, targetMembership.role, {
            scopeType: targetMembership.scopeType,
            scopeId: targetMembership.scopeId,
            systemId: targetMembership.systemId,
            environmentId: targetMembership.environmentId,
            subEnvironmentId: targetMembership.subEnvironmentId,
            roomId: targetMembership.roomId
        });
    }
}

module.exports = AuthorizationService;
