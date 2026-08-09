const AppError = require('../../errors/AppError.js');
const { ROLES } = require('../../domain/access/constants.js');

class MembershipService {
    constructor({ userRepository, membershipRepository, hierarchyIntegrityService, authorizationService }) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.hierarchyIntegrityService = hierarchyIntegrityService;
        this.authorizationService = authorizationService;
    }

    async assignRole({ actorUserId, targetUserId, role, scope }) {
        if (role === ROLES.SUPER_ADMIN) {
            throw new AppError({
                statusCode: 403,
                code: 'PROTECTED_ROLE_ASSIGNMENT_REQUIRED',
                message: 'SUPER_ADMIN requires the protected administrative assignment service'
            });
        }

        const targetUser = await this.userRepository.findActiveById(targetUserId);
        if (!targetUser) {
            throw new AppError({ statusCode: 404, code: 'ACTIVE_USER_NOT_FOUND', message: 'Active user was not found' });
        }

        const canonicalScope = await this.hierarchyIntegrityService.resolveScope({ role, ...scope });
        const authorized = await this.authorizationService.canAssignRole(actorUserId, role, canonicalScope);
        if (!authorized) {
            throw new AppError({
                statusCode: 403,
                code: 'ROLE_ASSIGNMENT_FORBIDDEN',
                message: 'Actor cannot assign this role at the requested scope'
            });
        }

        return this.membershipRepository.create({
            userId: targetUserId,
            role,
            ...canonicalScope,
            isActive: true,
            assignedBy: actorUserId
        });
    }

    async revokeMembership({ actorUserId, membershipId, reason }) {
        const membership = await this.membershipRepository.findActiveById(membershipId);
        if (!membership) {
            throw new AppError({ statusCode: 404, code: 'ACTIVE_MEMBERSHIP_NOT_FOUND', message: 'Active membership was not found' });
        }

        const authorized = await this.authorizationService.canManageMembership(actorUserId, membership);
        if (!authorized) {
            throw new AppError({ statusCode: 403, code: 'MEMBERSHIP_REVOKE_FORBIDDEN', message: 'Actor cannot revoke this membership' });
        }

        return this.membershipRepository.revoke(membershipId, {
            revokedBy: actorUserId,
            revocationReason: reason
        });
    }
}

module.exports = MembershipService;
