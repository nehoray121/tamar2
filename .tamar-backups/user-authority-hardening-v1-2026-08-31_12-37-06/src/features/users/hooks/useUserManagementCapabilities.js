export const useUserManagementCapabilities = (serverRoles = []) => ({
    currentAdmin: null,
    allowedRoles: serverRoles.map((role) => ({ id: role.key, label: role.label, scopeType: role.scopeType })),
    canCreateUsers: serverRoles.length > 0,
    canManageUser: () => serverRoles.length > 0
});