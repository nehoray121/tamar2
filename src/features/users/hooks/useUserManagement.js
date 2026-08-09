import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { userManagementService } from '../services/userManagementService.js';

const emptyOptions = Object.freeze({ roles: [], systems: [], environments: [], subEnvironments: [], rooms: [] });
const emptyPagination = Object.freeze({ page: 1, limit: 12, totalItems: 0, totalPages: 0, hasNext: false, hasPrevious: false });
const sameMembership = (membership, payload) => membership?.role === payload.role && String(membership?.scopeId) === String(payload.scope?.scopeId);

export const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [options, setOptions] = useState(emptyOptions);
    const [query, setQuery] = useState('');
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(emptyPagination);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');
    const requestSequence = useRef(0);
    const optionsLoaded = useRef(false);

    const load = useCallback(async ({ search = query, requestedPage = page, signal } = {}) => {
        const sequence = ++requestSequence.current;
        setStatus((current) => current === 'ready' ? 'refreshing' : 'loading');
        setError('');
        try {
            const [result, nextOptions] = await Promise.all([
                userManagementService.list({ search: search.trim(), status: 'ALL', page: requestedPage, limit: emptyPagination.limit }, { signal }),
                optionsLoaded.current ? Promise.resolve(null) : userManagementService.options({ signal })
            ]);
            if (sequence !== requestSequence.current) return;
            setUsers(result.items);
            setPagination(result.pagination || { ...emptyPagination, page: requestedPage });
            if (nextOptions) {
                setOptions(nextOptions);
                optionsLoaded.current = true;
            }
            setStatus('ready');
        } catch (loadError) {
            if (loadError?.name === 'AbortError' || sequence !== requestSequence.current) return;
            setError(loadError?.message || 'לא ניתן לטעון משתמשים.');
            setStatus('error');
        }
    }, [page, query]);

    useEffect(() => {
        const controller = new AbortController();
        load({ requestedPage: page, signal: controller.signal });
        return () => controller.abort();
    }, [page]);

    const replaceUser = (user) => setUsers((current) => current.map((item) => item.id === user.id ? user : item));
    const createUser = async (payload) => {
        const user = await userManagementService.createManagedUser(payload);
        setUsers((current) => [user, ...current.filter((item) => item.id !== user.id)].slice(0, emptyPagination.limit));
        setPagination((current) => ({
            ...current,
            page,
            totalItems: current.totalItems + 1,
            totalPages: Math.max(1, Math.ceil((current.totalItems + 1) / emptyPagination.limit))
        }));
        return user;
    };
    const addAssignment = async (userId, payload) => {
        const user = await userManagementService.addManagementAssignment(userId, payload);
        replaceUser(user);
        return user;
    };
    const removeAssignment = async (userId, membershipId) => {
        const user = await userManagementService.removeManagementAssignment(userId, membershipId);
        replaceUser(user);
        return user;
    };
    const updatePrimary = async (userId, payload) => {
        const current = users.find((user) => user.id === userId);
        if (sameMembership(current?.primaryScope, payload)) return current;
        let updated = await userManagementService.addManagementAssignment(userId, payload);
        if (current?.primaryScope?.id && current.primaryRole !== 'SUPER_ADMIN') {
            updated = await userManagementService.removeManagementAssignment(userId, current.primaryScope.id);
        }
        replaceUser(updated);
        return updated;
    };
    const setUserActive = async (userId, active) => {
        const current = users.find((user) => user.id === userId);
        if (!current) return null;
        const updated = await userManagementService.updateUser(current, { isActive: active });
        replaceUser(updated);
        return updated;
    };
    const search = async () => {
        setSearched(Boolean(query.trim()));
        if (page !== 1) setPage(1);
        else await load({ search: query, requestedPage: 1 });
    };
    const goToPage = (nextPage) => {
        const totalPages = Math.max(1, pagination.totalPages || 1);
        setPage(Math.min(totalPages, Math.max(1, nextPage)));
    };
    const filteredUsers = useMemo(() => users, [users]);

    return {
        users,
        filteredUsers,
        options,
        query,
        setQuery,
        searched,
        search,
        status,
        error,
        retry: () => load({ requestedPage: page }),
        page,
        pagination,
        goToPage,
        createUser,
        updatePrimary,
        addAssignment,
        updateAssignment: async () => {},
        removeAssignment,
        setUserActive
    };
};