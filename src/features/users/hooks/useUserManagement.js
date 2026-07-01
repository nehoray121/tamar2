import { useEffect, useMemo, useState } from 'react';
import { userManagementService } from '../services/userManagementService.js';

export const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [query, setQuery] = useState('');
    const [directoryResult, setDirectoryResult] = useState(null);
    const [searched, setSearched] = useState(false);

    useEffect(() => userManagementService.subscribe(setUsers), []);

    const filteredUsers = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return users;
        return users.filter((user) => user.id.toLowerCase().includes(normalized) || user.name.includes(query));
    }, [query, users]);

    const search = async () => {
        setSearched(Boolean(query.trim()));
        setDirectoryResult(query.trim() ? await userManagementService.searchDirectory(query.trim()) : null);
    };

    return {
        users,
        filteredUsers,
        query,
        setQuery,
        searched,
        directoryResult,
        search,
        createUser: userManagementService.createManagedUser,
        updatePrimary: userManagementService.updatePrimary,
        addAssignment: userManagementService.addManagementAssignment,
        updateAssignment: userManagementService.updateManagementAssignment,
        removeAssignment: userManagementService.removeManagementAssignment,
        setUserActive: userManagementService.setUserActive
    };
};
