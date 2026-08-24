const { ROLES } = require('../../domain/access/constants.js');
const AppError = require('../../errors/AppError.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

const forbidden = () => new AppError({
    statusCode: 403,
    code: 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN',
    message: 'The authenticated user cannot manage this organization hierarchy'
});

class OrganizationHierarchyAuthorizationService {
    constructor({ scopeResolver, integrityService }) {
        Object.assign(this, { scopeResolver, integrityService });
    }

    async access(userId) {
        const access = await this.scopeResolver.resolveEffectiveAccess(userId);
        if (!access.isActive) throw forbidden();
        return access;
    }

    hasRole(access, role, predicate) {
        return access.memberships.some((membership) => (
            membership.role === role && predicate(membership)
        ));
    }

    async assertCanCreateEnvironment(userId, systemId) {
        const lineage = await this.integrityService.resolveSystem(systemId, {
            requireOperational: true
        });
        const access = await this.access(userId);
        const authorized = this.hasRole(
            access,
            ROLES.SUPER_ADMIN,
            (membership) => sameId(membership.systemId, lineage.system._id)
        );
        if (!authorized) throw forbidden();
        return lineage;
    }

    async assertCanCreateSubEnvironment(userId, environmentId) {
        const lineage = await this.integrityService.resolveEnvironment(
            environmentId,
            { requireOperational: true }
        );
        const access = await this.access(userId);
        const authorized = (
            this.hasRole(
                access,
                ROLES.SUPER_ADMIN,
                (membership) => sameId(
                    membership.systemId,
                    lineage.system._id
                )
            )
            || this.hasRole(
                access,
                ROLES.ENVIRONMENT_ADMIN,
                (membership) => sameId(
                    membership.environmentId,
                    lineage.environment._id
                )
            )
        );
        if (!authorized) throw forbidden();
        return lineage;
    }

    async assertCanCreateRoom(userId, subEnvironmentId) {
        const lineage = await this.integrityService.resolveSubEnvironment(
            subEnvironmentId,
            { requireOperational: true }
        );
        const access = await this.access(userId);
        const authorized = (
            this.hasRole(
                access,
                ROLES.SUPER_ADMIN,
                (membership) => sameId(
                    membership.systemId,
                    lineage.system._id
                )
            )
            || this.hasRole(
                access,
                ROLES.ENVIRONMENT_ADMIN,
                (membership) => sameId(
                    membership.environmentId,
                    lineage.environment._id
                )
            )
            || this.hasRole(
                access,
                ROLES.SYSTEM_ADMIN,
                (membership) => sameId(
                    membership.subEnvironmentId,
                    lineage.subEnvironment._id
                )
            )
            || this.hasRole(
                access,
                ROLES.ROOM_MANAGER,
                (membership) => sameId(
                    membership.subEnvironmentId,
                    lineage.subEnvironment._id
                )
            )
        );
        if (!authorized) throw forbidden();
        return lineage;
    }
}

module.exports = OrganizationHierarchyAuthorizationService;
