const { ROLES } = require('../../domain/access/constants.js');
const { toIdSet } = require('../../domain/access/validators.js');
const emptyAccess = (userId) => ({ userId: String(userId), isActive: false, global: false, memberships: [], systemIds: [], environmentIds: [], subEnvironmentIds: [], roomIds: [], managedRoomIds: [], systemAdminRoomIds: [] });
class ScopeResolver {
    constructor({ userRepository, membershipRepository, hierarchyIntegrityService }) { Object.assign(this, { userRepository, membershipRepository, hierarchyIntegrityService }); }
    async resolveEffectiveAccess(userId, options = {}) {
        const user = await this.userRepository.findActiveById(userId, options);
        if (!user) return emptyAccess(userId);
        const stored = await this.membershipRepository.findActiveByUserId(userId, options);
        const flags = [];
        for (const membership of stored) flags.push(await this.hierarchyIntegrityService.isScopeOperational(membership, options));
        const memberships = stored.filter((_membership, index) => flags[index]);
        const systemIds = toIdSet(memberships.map((item) => item.systemId));
        const environmentIds = toIdSet(memberships.map((item) => item.environmentId));
        const subEnvironmentIds = toIdSet(memberships.map((item) => item.subEnvironmentId));
        const roomIds = toIdSet(memberships.map((item) => item.roomId));
        const directManagedRoomIds = memberships.filter((item) => item.role === ROLES.ROOM_MANAGER).map((item) => item.roomId);
        const adminSubEnvironmentIds = memberships.filter((item) => item.role === ROLES.SYSTEM_ADMIN).map((item) => item.subEnvironmentId);
        const superAdminSystemIds = memberships.filter((item) => item.role === ROLES.SUPER_ADMIN).map((item) => item.systemId);
        const systemAdminRoomIds = new Set();
        if (adminSubEnvironmentIds.length) {
            const descendants = await this.hierarchyIntegrityService.getActiveRoomIdsForSubEnvironments(adminSubEnvironmentIds, options);
            descendants.forEach((id) => {
                roomIds.add(String(id));
                systemAdminRoomIds.add(String(id));
            });
        }
        if (superAdminSystemIds.length) {
            const descendants = await this.hierarchyIntegrityService.getActiveRoomIdsForSystems(superAdminSystemIds, options);
            descendants.forEach((id) => roomIds.add(String(id)));
        }
        const managedRoomIds = new Set([...directManagedRoomIds.filter(Boolean).map(String), ...systemAdminRoomIds]);
        return { userId: String(userId), isActive: true, global: memberships.some((item) => item.role === ROLES.SUPER_ADMIN), memberships, systemIds: [...systemIds], environmentIds: [...environmentIds], subEnvironmentIds: [...subEnvironmentIds], roomIds: [...roomIds], managedRoomIds: [...managedRoomIds], systemAdminRoomIds: [...systemAdminRoomIds] };
    }
    async getActiveMemberships(userId, options = {}) { return (await this.resolveEffectiveAccess(userId, options)).memberships; }
    async getAccessibleEnvironmentIds(userId) { return (await this.resolveEffectiveAccess(userId)).environmentIds; }
    async getAccessibleSubEnvironmentIds(userId) { return (await this.resolveEffectiveAccess(userId)).subEnvironmentIds; }
    async getAccessibleRoomIds(userId) { return (await this.resolveEffectiveAccess(userId)).roomIds; }
    async hasRoleAtScope(userId, role, scopeType, scopeId) {
        return (await this.getActiveMemberships(userId)).some((item) => item.role === role && item.scopeType === scopeType && String(item.scopeId) === String(scopeId));
    }
}

module.exports = ScopeResolver;
