const { ROLES } = require('../../domain/access/constants.js');
const { toIdSet } = require('../../domain/access/validators.js');

const emptyAccess = (userId) => ({
    userId: String(userId),
    isActive: false,
    global: false,
    memberships: [],
    systemIds: [],
    environmentIds: [],
    subEnvironmentIds: [],
    roomIds: [],
    managedRoomIds: [],
    environmentAdminRoomIds: [],
    systemAdminRoomIds: []
});

class ScopeResolver {
    constructor({ userRepository, membershipRepository, hierarchyIntegrityService }) {
        Object.assign(this, { userRepository, membershipRepository, hierarchyIntegrityService });
    }

    async resolveEffectiveAccess(userId, options = {}) {
        const user = await this.userRepository.findActiveById(userId, options);
        if (!user) return emptyAccess(userId);

        const stored = await this.membershipRepository.findActiveByUserId(userId, options);
        const operational = [];
        for (const membership of stored) {
            operational.push(await this.hierarchyIntegrityService.isScopeOperational(membership, options));
        }
        const memberships = stored.filter((_membership, index) => operational[index]);

        const systemIds = toIdSet(memberships.map((item) => item.systemId));
        const environmentIds = toIdSet(memberships.map((item) => item.environmentId));
        const subEnvironmentIds = toIdSet(memberships.map((item) => item.subEnvironmentId));
        const roomIds = toIdSet(memberships.map((item) => item.roomId));

        const directManagedRoomIds = memberships
            .filter((item) => item.role === ROLES.ROOM_MANAGER)
            .map((item) => item.roomId)
            .filter(Boolean);

        const environmentAdminEnvironmentIds = memberships
            .filter((item) => item.role === ROLES.ENVIRONMENT_ADMIN)
            .map((item) => item.environmentId)
            .filter(Boolean);

        const systemAdminSubEnvironmentIds = memberships
            .filter((item) => item.role === ROLES.SYSTEM_ADMIN)
            .map((item) => item.subEnvironmentId)
            .filter(Boolean);

        const superAdminSystemIds = memberships
            .filter((item) => item.role === ROLES.SUPER_ADMIN)
            .map((item) => item.systemId)
            .filter(Boolean);

        const environmentAdminRoomIds = new Set();
        if (environmentAdminEnvironmentIds.length) {
            const [descendantSubEnvironments, descendantRooms] = await Promise.all([
                this.hierarchyIntegrityService.getActiveSubEnvironmentIdsForEnvironments(
                    environmentAdminEnvironmentIds,
                    options
                ),
                this.hierarchyIntegrityService.getActiveRoomIdsForEnvironments(
                    environmentAdminEnvironmentIds,
                    options
                )
            ]);

            descendantSubEnvironments.forEach((id) => subEnvironmentIds.add(String(id)));
            descendantRooms.forEach((id) => {
                roomIds.add(String(id));
                environmentAdminRoomIds.add(String(id));
            });
        }

        const systemAdminRoomIds = new Set();
        if (systemAdminSubEnvironmentIds.length) {
            const descendants = await this.hierarchyIntegrityService.getActiveRoomIdsForSubEnvironments(
                systemAdminSubEnvironmentIds,
                options
            );
            descendants.forEach((id) => {
                roomIds.add(String(id));
                systemAdminRoomIds.add(String(id));
            });
        }

        if (superAdminSystemIds.length) {
            const descendants = await this.hierarchyIntegrityService.getActiveRoomIdsForSystems(
                superAdminSystemIds,
                options
            );
            descendants.forEach((id) => roomIds.add(String(id)));
        }

        const managedRoomIds = new Set([
            ...directManagedRoomIds.map(String),
            ...environmentAdminRoomIds,
            ...systemAdminRoomIds
        ]);

        return {
            userId: String(userId),
            isActive: true,
            global: memberships.some((item) => item.role === ROLES.SUPER_ADMIN),
            memberships,
            systemIds: [...systemIds],
            environmentIds: [...environmentIds],
            subEnvironmentIds: [...subEnvironmentIds],
            roomIds: [...roomIds],
            managedRoomIds: [...managedRoomIds],
            environmentAdminRoomIds: [...environmentAdminRoomIds],
            systemAdminRoomIds: [...systemAdminRoomIds]
        };
    }

    async getActiveMemberships(userId, options = {}) {
        return (await this.resolveEffectiveAccess(userId, options)).memberships;
    }

    async getAccessibleEnvironmentIds(userId) {
        return (await this.resolveEffectiveAccess(userId)).environmentIds;
    }

    async getAccessibleSubEnvironmentIds(userId) {
        return (await this.resolveEffectiveAccess(userId)).subEnvironmentIds;
    }

    async getAccessibleRoomIds(userId) {
        return (await this.resolveEffectiveAccess(userId)).roomIds;
    }

    async hasRoleAtScope(userId, role, scopeType, scopeId) {
        return (await this.getActiveMemberships(userId)).some((item) => (
            item.role === role
            && item.scopeType === scopeType
            && String(item.scopeId) === String(scopeId)
        ));
    }
}

module.exports = ScopeResolver;
