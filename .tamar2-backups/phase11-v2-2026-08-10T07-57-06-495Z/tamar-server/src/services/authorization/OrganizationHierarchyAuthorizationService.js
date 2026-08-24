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
        this.scopeResolver = scopeResolver;
        this.integrityService = integrityService;
    }

    async assertSystemSuperAdmin(userId, systemId) {
        const access = await this.scopeResolver.resolveEffectiveAccess(userId);
        const authorized = access.memberships.some((membership) => (
            membership.role === ROLES.SUPER_ADMIN
            && sameId(membership.systemId, systemId)
        ));
        if (!authorized) throw forbidden();
        return access;
    }

    async assertCanCreateSubEnvironment(userId, environmentId) {
        const lineage = await this.integrityService.resolveEnvironment(environmentId, {
            requireOperational: true
        });
        await this.assertSystemSuperAdmin(userId, lineage.system._id);
        return lineage;
    }

    async assertCanCreateRoom(userId, subEnvironmentId) {
        const lineage = await this.integrityService.resolveSubEnvironment(subEnvironmentId, {
            requireOperational: true
        });
        await this.assertSystemSuperAdmin(userId, lineage.system._id);
        return lineage;
    }
}

module.exports = OrganizationHierarchyAuthorizationService;

