import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SUPER_ADMIN_TAB, SUPER_ADMIN_TABS } from '../constants.js';

const tabIds = new Set(SUPER_ADMIN_TABS.map((tab) => tab.id));

const readStateFromUrl = () => {
    if (typeof window === 'undefined') return { activeTab: DEFAULT_SUPER_ADMIN_TAB, scope: {} };
    const [, first, tabSegment] = window.location.pathname.split('/');
    const activeTab = first === 'super-admin' && tabIds.has(tabSegment) ? tabSegment : DEFAULT_SUPER_ADMIN_TAB;
    const params = new URLSearchParams(window.location.search);
    return {
        activeTab,
        scope: {
            environmentId: params.get('environment') || '',
            subEnvironmentId: params.get('subEnvironment') || '',
            roomId: params.get('room') || ''
        }
    };
};

const buildUrl = (activeTab, scope) => {
    const params = new URLSearchParams();
    if (scope.environmentId) params.set('environment', scope.environmentId);
    if (scope.subEnvironmentId) params.set('subEnvironment', scope.subEnvironmentId);
    if (scope.roomId) params.set('room', scope.roomId);
    const query = params.toString();
    return `/super-admin/${activeTab}${query ? `?${query}` : ''}`;
};

export function useSuperAdminScope() {
    const initialState = useMemo(readStateFromUrl, []);
    const [activeTab, setActiveTabState] = useState(initialState.activeTab);
    const [scope, setScopeState] = useState(initialState.scope);

    const pushState = useCallback((nextTab, nextScope) => {
        if (typeof window === 'undefined') return;
        const nextUrl = buildUrl(nextTab, nextScope);
        if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
            window.history.pushState({ view: 'super_admin', tab: nextTab }, '', nextUrl);
        }
    }, []);

    const setActiveTab = useCallback((nextTab) => {
        setActiveTabState(nextTab);
        pushState(nextTab, scope);
    }, [pushState, scope]);

    const setScope = useCallback((updates) => {
        setScopeState((current) => {
            const next = typeof updates === 'function' ? updates(current) : { ...current, ...updates };
            pushState(activeTab, next);
            return next;
        });
    }, [activeTab, pushState]);

    const resetScope = useCallback(() => setScope({ environmentId: '', subEnvironmentId: '', roomId: '' }), [setScope]);

    useEffect(() => {
        const handlePopState = () => {
            const next = readStateFromUrl();
            setActiveTabState(next.activeTab);
            setScopeState(next.scope);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        pushState(activeTab, scope);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { activeTab, setActiveTab, scope, setScope, resetScope };
}
