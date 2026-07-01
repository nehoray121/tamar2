import { roleLabels } from '../data/mockUserManagementData.js';

const roleHierarchy = {
    super_admin: ['super_admin', 'environment_admin', 'sub_environment_admin', 'room_admin'],
    environment_admin: ['sub_environment_admin', 'room_admin'],
    sub_environment_admin: ['room_admin'],
    room_admin: []
};

// Temporary frontend capability resolver. Replace the currentAdmin shape with backend-auth capabilities later.
export const useUserManagementCapabilities = () => {
    const currentAdmin = {
        role: 'super_admin',
        scope: {}
    };

    const allowedRoleIds = roleHierarchy[currentAdmin.role] || [];
    const allowedRoles = allowedRoleIds.map((id) => ({ id, label: roleLabels[id] }));

    return {
        currentAdmin,
        allowedRoles,
        canCreateUsers: allowedRoles.length > 0,
        canManageUser: () => currentAdmin.role === 'super_admin'
    };
};
