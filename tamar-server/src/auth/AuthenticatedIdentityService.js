const AppError = require('../errors/AppError.js');
const { ROLES } = require('../domain/access/constants.js');

const conflict = () => new AppError({
    statusCode: 403,
    code: 'IDENTITY_BINDING_CONFLICT',
    message: 'The verified identity cannot be bound to this Tamar user'
});

class AuthenticatedIdentityService {
    constructor({
        userRepository,
        accessRequestRepository,
        scopeResolver,
        personalNumberService
    }) {
        Object.assign(this, {
            userRepository,
            accessRequestRepository,
            scopeResolver,
            personalNumberService
        });
    }

    async resolveUser(auth, { bindIfUnbound = true, session } = {}) {
        const [byHash, byExternalIdentity] = await Promise.all([
            this.userRepository.findByPersonalNumberLookupHash(
                auth.personalNumberLookupHash,
                { session, includeIdentityProtection: true }
            ),
            this.userRepository.findByExternalIdentity(
                auth.provider,
                auth.subject,
                { session, includeIdentityProtection: true }
            )
        ]);
        if (byHash && byExternalIdentity
            && String(byHash._id) !== String(byExternalIdentity._id)) {
            throw conflict();
        }

        const user = byHash || byExternalIdentity;
        if (!user) return null;
        if (!this.personalNumberService.safeEqual(
            user.personalNumberLookupHash,
            auth.personalNumberLookupHash
        )) {
            throw conflict();
        }

        const binding = user.externalIdentity;
        if (binding?.provider || binding?.subject) {
            if (binding.provider !== auth.provider || binding.subject !== auth.subject) {
                throw conflict();
            }
            return user;
        }

        if (!bindIfUnbound) throw conflict();
        try {
            return await this.userRepository.bindExternalIdentity(
                user._id,
                auth,
                { session }
            );
        } catch {
            throw conflict();
        }
    }

    safeIdentity(auth) {
        return {
            displayName: auth.displayName,
            email: auth.email,
            personalNumberMasked: this.personalNumberService.mask(
                auth.personalNumberLast4
            )
        };
    }

    safeAccessRequest(request) {
        return {
            id: String(request._id),
            requestType: request.requestType,
            requestedRole: request.requestedRole,
            requestedScopeType: request.requestedScopeType,
            requestedScopeId: String(request.requestedScopeId),
            status: request.status,
            createdAt: request.createdAt
        };
    }

    safeMembership(membership) {
        return {
            id: String(membership._id),
            role: membership.role,
            scopeType: membership.scopeType,
            scopeId: String(membership.scopeId),
            systemId: String(membership.systemId),
            environmentId: membership.environmentId
                ? String(membership.environmentId)
                : null,
            subEnvironmentId: membership.subEnvironmentId
                ? String(membership.subEnvironmentId)
                : null,
            roomId: membership.roomId ? String(membership.roomId) : null
        };
    }

    hierarchyCapabilities(memberships) {
        const superAdminSystemIds = memberships
            .filter((membership) => membership.role === ROLES.SUPER_ADMIN)
            .map((membership) => membership.systemId);

        const environmentAdminEnvironmentIds = memberships
            .filter((membership) => (
                membership.role === ROLES.ENVIRONMENT_ADMIN
            ))
            .map((membership) => membership.environmentId)
            .filter(Boolean);

        const systemAdminSubEnvironmentIds = memberships
            .filter((membership) => membership.role === ROLES.SYSTEM_ADMIN)
            .map((membership) => membership.subEnvironmentId)
            .filter(Boolean);

        const roomManagerSubEnvironmentIds = memberships
            .filter((membership) => membership.role === ROLES.ROOM_MANAGER)
            .map((membership) => membership.subEnvironmentId)
            .filter(Boolean);

        return {
            canCreateEnvironment: superAdminSystemIds.length > 0,
            canCreateSubEnvironment: (
                superAdminSystemIds.length > 0
                || environmentAdminEnvironmentIds.length > 0
            ),
            canCreateRoom: memberships.some((membership) => (
                membership.role !== ROLES.ROOM_USER
            )),
            superAdminSystemIds: [...new Set(superAdminSystemIds)],
            environmentAdminEnvironmentIds: [
                ...new Set(environmentAdminEnvironmentIds)
            ],
            systemAdminSubEnvironmentIds: [
                ...new Set(systemAdminSubEnvironmentIds)
            ],
            roomManagerSubEnvironmentIds: [
                ...new Set(roomManagerSubEnvironmentIds)
            ]
        };
    }

    async getAuthenticationState(auth) {
        const user = await this.resolveUser(auth);
        if (user && !user.isActive) {
            throw new AppError({
                statusCode: 403,
                code: 'USER_DISABLED',
                message: 'The authenticated user is disabled in Tamar'
            });
        }

        if (user) {
            const effectiveAccess = await this.scopeResolver.resolveEffectiveAccess(
                user._id
            );
            if (effectiveAccess.memberships.length > 0) {
                const memberships = effectiveAccess.memberships.map(
                    (membership) => this.safeMembership(membership)
                );
                const safeEffectiveAccess = {
                    global: effectiveAccess.global,
                    systemIds: effectiveAccess.systemIds,
                    environmentIds: effectiveAccess.environmentIds,
                    subEnvironmentIds: effectiveAccess.subEnvironmentIds,
                    roomIds: effectiveAccess.roomIds,
                    managedRoomIds: effectiveAccess.managedRoomIds
                };

                const managerRoles = [
                    ROLES.ROOM_MANAGER,
                    ROLES.SYSTEM_ADMIN,
                    ROLES.ENVIRONMENT_ADMIN,
                    ROLES.SUPER_ADMIN
                ];

                return {
                    status: 'AUTHORIZED',
                    user: {
                        id: String(user._id),
                        ...this.safeIdentity({
                            ...auth,
                            displayName: user.displayName,
                            email: user.email
                        })
                    },
                    memberships,
                    effectiveAccess: safeEffectiveAccess,
                    capabilities: {
                        reviewAccessRequests: memberships.some((membership) => (
                            managerRoles.includes(membership.role)
                        )),
                        manageSystem: effectiveAccess.global,
                        organizationHierarchy: this.hierarchyCapabilities(memberships)
                    }
                };
            }
        }

        const pending = await this.accessRequestRepository
            .findCurrentPendingForIdentity({
                personalNumberLookupHash: auth.personalNumberLookupHash,
                requesterUserId: user?._id
            });
        if (pending) {
            return {
                status: 'ACCESS_REQUEST_PENDING',
                accessRequest: this.safeAccessRequest(pending)
            };
        }

        if (!user) {
            return {
                status: 'ACCESS_REQUIRED',
                reason: 'USER_NOT_PROVISIONED',
                identity: this.safeIdentity(auth)
            };
        }

        return {
            status: 'ACCESS_REQUIRED',
            reason: 'NO_ACTIVE_MEMBERSHIPS',
            user: {
                id: String(user._id),
                ...this.safeIdentity({
                    ...auth,
                    displayName: user.displayName,
                    email: user.email
                })
            }
        };
    }
}

module.exports = AuthenticatedIdentityService;
module.exports.identityBindingConflict = conflict;
