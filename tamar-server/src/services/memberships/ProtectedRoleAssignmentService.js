const AppError = require('../../errors/AppError.js');
const { ROLES, SCOPE_TYPES } = require('../../domain/access/constants.js');

class ProtectedRoleAssignmentService {
    constructor({ userRepository, membershipRepository, scopeResolver, hierarchyIntegrityService }) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.scopeResolver = scopeResolver;
        this.hierarchyIntegrityService = hierarchyIntegrityService;
    }

    async assignSuperAdmin({ actorUserId, targetUserId, systemId }) {
        const actorAccess = await this.scopeResolver.resolveEffectiveAccess(actorUserId);
        if (!actorAccess.isActive || !actorAccess.global || !actorAccess.systemIds.includes(String(systemId))) {
            throw new AppError({
                statusCode: 403,
                code: 'SUPER_ADMIN_ASSIGNMENT_FORBIDDEN',
                message: 'Only an authenticated SUPER_ADMIN for this System may assign SUPER_ADMIN'
            });
        }

        const targetUser = await this.userRepository.findActiveById(targetUserId);
        if (!targetUser) {
            throw new AppError({ statusCode: 404, code: 'ACTIVE_USER_NOT_FOUND', message: 'Active user was not found' });
        }

        const canonicalScope = await this.hierarchyIntegrityService.resolveScope({
            role: ROLES.SUPER_ADMIN,
            scopeType: SCOPE_TYPES.SYSTEM,
            scopeId: systemId,
            systemId
        });

        return this.membershipRepository.create({
            userId: targetUserId,
            role: ROLES.SUPER_ADMIN,
            ...canonicalScope,
            isActive: true,
            assignedBy: actorUserId
        });
    }
}

module.exports = ProtectedRoleAssignmentService;
