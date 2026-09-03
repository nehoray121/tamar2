export const useUserManagementCapabilities = (serverOptions = {}) => {
    const normalized = Array.isArray(serverOptions)
        ? { roles: serverOptions, permissions: {} }
        : (serverOptions || {});
    const roles = normalized.roles || [];
    const permissions = normalized.permissions || {};

    return {
        currentAdmin: permissions,
        allowedRoles: roles.map((role) => ({
            id: role.key,
            label: role.label,
            scopeType: role.scopeType
        })),
        canCreateUsers: permissions.canCreateUsers ?? roles.length > 0,
        canManageUser: () => (
            permissions.canManageMemberships
            ?? roles.length > 0
        ),
        canManageMemberships: (
            permissions.canManageMemberships
            ?? roles.length > 0
        ),
        canEditUserProfile: Boolean(
            permissions.canEditUserProfile
        ),
        canSetUserActive: Boolean(
            permissions.canSetUserActive
        ),
        roomManagerOnly: Boolean(
            permissions.roomManagerOnly
        ),
        fieldLocks: permissions.fieldLocks || {}
    };
};
