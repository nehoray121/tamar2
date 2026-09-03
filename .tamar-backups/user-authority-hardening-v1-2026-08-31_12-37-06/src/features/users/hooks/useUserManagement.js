import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { userManagementService } from '../services/userManagementService.js';
import { subscribeUserManagementRealtime } from '../../tickets/boards/realtime/boardSocket.js';

const PAGE_LIMIT = 100;

const emptyOptions = Object.freeze({
    roles: [],
    systems: [],
    environments: [],
    subEnvironments: [],
    rooms: []
});

const emptyPagination = Object.freeze({
    page: 1,
    limit: PAGE_LIMIT,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
});

const sameMembership = (
    membership,
    payload
) => (
    membership?.role === payload.role
    && String(membership?.scopeId)
        === String(payload.scope?.scopeId)
);

export const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [options, setOptions] = useState(emptyOptions);
    const [query, setQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(emptyPagination);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');
    const requestSequence = useRef(0);
    const optionsLoaded = useRef(false);

    const load = useCallback(async ({
        search = appliedSearch,
        requestedPage = page,
        signal
    } = {}) => {
        const sequence = ++requestSequence.current;

        setStatus((current) => (
            current === 'ready' ? 'refreshing' : 'loading'
        ));
        setError('');

        try {
            const [result, nextOptions] = await Promise.all([
                userManagementService.list({
                    search: search.trim(),
                    status: 'ALL',
                    page: requestedPage,
                    limit: PAGE_LIMIT
                }, { signal }),
                optionsLoaded.current
                    ? Promise.resolve(null)
                    : userManagementService.options({ signal })
            ]);

            if (sequence !== requestSequence.current) return;

            setUsers(result.items);
            setPagination(
                result.pagination || {
                    ...emptyPagination,
                    page: requestedPage
                }
            );

            if (nextOptions) {
                setOptions(nextOptions);
                optionsLoaded.current = true;
            }

            setStatus('ready');
        } catch (loadError) {
            if (
                loadError?.name === 'AbortError'
                || sequence !== requestSequence.current
            ) return;

            setError(loadError?.message || 'לא ניתן לטעון משתמשים.');
            setStatus('error');
        }
    }, [appliedSearch, page]);

    useEffect(() => {
        const controller = new AbortController();

        load({
            requestedPage: page,
            signal: controller.signal
        });

        return () => controller.abort();
    }, [load, page]);

    useEffect(() => subscribeUserManagementRealtime({
        onInvalidate: () => load({ requestedPage: page })
    }), [load, page]);

    const replaceUser = useCallback((user) => {
        if (!user?.id) return;

        setUsers((current) => {
            const exists = current.some((item) => item.id === user.id);

            if (!exists) {
                return [user, ...current];
            }

            return current.map((item) => (
                item.id === user.id ? user : item
            ));
        });
    }, []);

    const refreshUser = useCallback(async (userId) => {
        const user = await userManagementService.getManagedUser(userId);
        replaceUser(user);
        return user;
    }, [replaceUser]);

    const createUser = async (payload) => {
        const user = await userManagementService.createManagedUser(payload);

        replaceUser(user);

        setPagination((current) => ({
            ...current,
            totalItems: current.totalItems + 1,
            totalPages: Math.max(
                1,
                Math.ceil((current.totalItems + 1) / PAGE_LIMIT)
            )
        }));

        return user;
    };

    const addAssignment = async (userId, payload) => {
        const user = await userManagementService.addManagementAssignment(
            userId,
            payload
        );
        replaceUser(user);
        return user;
    };

    const removeAssignment = async (userId, membershipId) => {
        const user = await userManagementService.removeManagementAssignment(
            userId,
            membershipId
        );
        replaceUser(user);
        return user;
    };

    const updatePrimary = async (userId, payload) => {
        const current = users.find((user) => user.id === userId)
            || await refreshUser(userId);

        if (!current) {
            throw new Error('המשתמש לא נמצא.');
        }

        if (sameMembership(current.primaryScope, payload)) {
            return current;
        }

        if (
            current.primaryRole === 'SUPER_ADMIN'
            && payload.role !== 'SUPER_ADMIN'
        ) {
            throw new Error(
                'שינוי הרשאת מנהל־על דורש מסלול מנהלי מוגן ואינו זמין מהטופס הרגיל.'
            );
        }

        const existingTarget = (current.memberships || []).find(
            (membership) => sameMembership(membership, payload)
        );

        let afterAdd = current;
        let addedMembership = null;

        if (!existingTarget) {
            afterAdd = await userManagementService.addManagementAssignment(
                userId,
                payload
            );

            addedMembership = (afterAdd.memberships || []).find(
                (membership) => (
                    sameMembership(membership, payload)
                    && !(current.memberships || []).some(
                        (existing) => existing.id === membership.id
                    )
                )
            );
        }

        try {
            if (
                current.primaryScope?.id
                && current.primaryRole !== 'SUPER_ADMIN'
            ) {
                afterAdd = await userManagementService
                    .removeManagementAssignment(
                        userId,
                        current.primaryScope.id
                    );
            } else if (existingTarget) {
                afterAdd = await refreshUser(userId);
            }
        } catch (removeError) {
            if (addedMembership?.id) {
                try {
                    await userManagementService.removeManagementAssignment(
                        userId,
                        addedMembership.id
                    );
                } catch {
                    // Best-effort rollback. Preserve original server error.
                }
            }

            throw removeError;
        }

        replaceUser(afterAdd);
        return afterAdd;
    };

    const updateUserProfile = async (userId, updates) => {
        const current = users.find((user) => user.id === userId)
            || await refreshUser(userId);

        if (!current) {
            throw new Error('המשתמש לא נמצא.');
        }

        const updated = await userManagementService.updateUser(
            current,
            updates
        );

        replaceUser(updated);
        return updated;
    };

    const setUserActive = async (userId, active) => updateUserProfile(
        userId,
        { isActive: active }
    );

    const search = async () => {
        const nextSearch = query.trim();

        setSearched(Boolean(nextSearch));

        if (page !== 1) {
            setPage(1);
        }

        if (appliedSearch !== nextSearch) {
            setAppliedSearch(nextSearch);
            return;
        }

        await load({
            search: nextSearch,
            requestedPage: 1
        });
    };

    const goToPage = (nextPage) => {
        const totalPages = Math.max(
            1,
            pagination.totalPages || 1
        );

        setPage(
            Math.min(
                totalPages,
                Math.max(1, nextPage)
            )
        );
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
        refresh: () => load({ requestedPage: page }),
        refreshUser,
        page,
        pagination,
        goToPage,
        createUser,
        updateUserProfile,
        updatePrimary,
        addAssignment,
        updateAssignment: async () => {},
        removeAssignment,
        setUserActive
    };
};
