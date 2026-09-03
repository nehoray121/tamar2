import React, { useEffect, useMemo, useState } from 'react';
import AppRoutes from '../../app/AppRoutes.jsx';
import {
    loadLocalAuthenticationUi
} from '../../features/auth/runtimeAuthentication.js';
import {
    EnvironmentSelectionModal
} from '../../pages/HierarchyPage/index.js';
import { useSessionStore } from '../../store/session.store.js';
import ThemeControl from '../../features/theme/ThemeControl.jsx';
import {
    refreshBoardSocketAccess,
    subscribeAccessRequestRealtime,
    subscribeOrganizationRealtime
} from '../../features/tickets/boards/realtime/boardSocket.js';
import {
    useExternalReceivedBadge
} from '../../features/tickets/hooks/useExternalReceivedBadge.js';
import Sidebar from './Sidebar.jsx';
import GlobalToastViewport from '../../features/notifications/GlobalToastViewport.jsx';
import useHierarchyDropdownPolish from '../../features/inquiries/hooks/useHierarchyDropdownPolish.js';

const navItemsBase = [
    {
        id: 'super_admin',
        icon: 'shield',
        label: 'מרכז שליטה',
        superAdminOnly: true
    },
    { id: 'hierarchy', icon: 'pie', label: 'בחירת חדרים' },
    { id: 'dashboard', icon: 'barChart', label: 'דשבורד' },
    { id: 'new_complaint', icon: 'filePlus', label: 'פנייה חדשה' },
    { id: 'my_tasks', icon: 'checkCircle', label: 'המשימות שלי' },
    { id: 'open_complaints', icon: 'inbox', label: 'פניות פתוחות' },
    { id: 'history', icon: 'clock', label: 'היסטוריית פניות' },
    { id: 'external', icon: 'users', label: 'פניות חיצוניות' },
    {
        id: 'settings',
        icon: 'edit',
        label: 'הגדרות מערכת',
        managerOnly: true
    }
];

const managerRoles = new Set([
    'SUPER_ADMIN',
    'ENVIRONMENT_ADMIN',
    'SYSTEM_ADMIN',
    'ROOM_MANAGER'
]);

const LoadingGate = () => (
    <div
        className="flex min-h-screen w-full items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-300"
        dir="rtl"
    >
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 font-bold shadow-sm dark:border-slate-800 dark:bg-slate-900">
            מאמת את ההתחברות למערכת…
        </div>
    </div>
);

const ErrorGate = ({ message, onRetry }) => (
    <div
        className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-5 dark:bg-slate-950"
        dir="rtl"
    >
        <section className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-slate-900 shadow-xl dark:border-red-900/40 dark:bg-slate-900 dark:text-slate-50">
            <h1 className="text-2xl font-black">לא ניתן לפתוח את תמר</h1>
            <p className="mt-3 leading-7 text-slate-500 dark:text-slate-300">
                {message}
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-6 h-11 rounded-xl bg-blue-600 px-6 font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
            >
                ניסיון נוסף
            </button>
        </section>
    </div>
);

function AppShell() {
    useHierarchyDropdownPolish();
    const [localUi, setLocalUi] = useState(null);
    const hasSelectedRoom = useSessionStore(
        (state) => state.hasSelectedRoom
    );
    const currentView = useSessionStore((state) => state.currentView);
    const showEnvModal = useSessionStore((state) => state.showEnvModal);
    const organizationHierarchy = useSessionStore(
        (state) => state.organizationHierarchy
    );
    const authRuntimeMode = useSessionStore(
        (state) => state.authRuntimeMode
    );
    const authStatus = useSessionStore((state) => state.authStatus);
    const authError = useSessionStore((state) => state.authError);
    const hierarchyStatus = useSessionStore(
        (state) => state.hierarchyStatus
    );
    const hierarchyError = useSessionStore(
        (state) => state.hierarchyError
    );
    const memberships = useSessionStore((state) => state.memberships);
    const currentUser = useSessionStore((state) => state.currentUser);
    const capabilities = useSessionStore((state) => state.capabilities);
    const initializeRuntimeContext = useSessionStore(
        (state) => state.initializeRuntimeContext
    );
    const loginLocally = useSessionStore((state) => state.loginLocally);
    const resetLocalSession = useSessionStore(
        (state) => state.resetLocalSession
    );
    const confirmEnvironment = useSessionStore(
        (state) => state.confirmEnvironment
    );
    const selectRoom = useSessionStore((state) => state.selectRoom);
    const navigate = useSessionStore((state) => state.navigate);
    const returnFromSuperAdmin = useSessionStore(
        (state) => state.returnFromSuperAdmin
    );
    const openEnvironmentModal = useSessionStore(
        (state) => state.openEnvironmentModal
    );
    const closeEnvironmentModal = useSessionStore(
        (state) => state.closeEnvironmentModal
    );
    const externalReceivedCount = useExternalReceivedBadge();


    const isSuperAdmin = memberships.some(
        (membership) => membership.role === 'SUPER_ADMIN'
    );
    const canManageUsers = memberships.some(
        (membership) => managerRoles.has(membership.role)
    );
    const canManageSettings = canManageUsers;

    const navItems = useMemo(() => navItemsBase
        .filter((item) => (
            (!item.superAdminOnly || isSuperAdmin)
            && (
                !item.reviewerOnly
                || capabilities.reviewAccessRequests
            )
            && (!item.managerOnly || canManageSettings)
        ))
        .map((item) => (
            item.id === 'external'
                ? {
                    ...item,
                    badge: String(externalReceivedCount)
                }
                : item
        )), [
        canManageSettings,
        capabilities.reviewAccessRequests,
        externalReceivedCount,
        isSuperAdmin
    ]);

    useEffect(() => {
        initializeRuntimeContext();
    }, [initializeRuntimeContext]);

    useEffect(() => {
        const handleSocketAuthExpired = async () => {
            await initializeRuntimeContext({
                force: true,
                preserveAuthenticatedView: true
            });

            if (
                useSessionStore.getState().authStatus
                === 'authenticated'
            ) {
                refreshBoardSocketAccess();
            }
        };

        window.addEventListener(
            'tamar:socket-auth-expired',
            handleSocketAuthExpired
        );

        return () => {
            window.removeEventListener(
                'tamar:socket-auth-expired',
                handleSocketAuthExpired
            );
        };
    }, [initializeRuntimeContext]);

    useEffect(() => {
        let active = true;
        loadLocalAuthenticationUi().then((module) => {
            if (active && module) setLocalUi(module);
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (authStatus !== 'authenticated') return undefined;

        const refreshPermissions = async (payload = {}) => {
            if (
                payload?.userId
                && currentUser?.id
                && String(payload.userId)
                    !== String(currentUser.id)
            ) {
                return;
            }

            await initializeRuntimeContext({
                force: true,
                preserveAuthenticatedView: true
            });

            if (
                useSessionStore.getState().authStatus
                === 'authenticated'
            ) {
                refreshBoardSocketAccess();
            }
        };

        const unsubscribeAccess = subscribeAccessRequestRealtime({
            onPermissionsUpdated: refreshPermissions
        });
        const unsubscribeOrganization = subscribeOrganizationRealtime({
            onInvalidate: () => initializeRuntimeContext({
                force: true,
                preserveAuthenticatedView: true
            })
        });

        return () => {
            unsubscribeAccess?.();
            unsubscribeOrganization?.();
        };
    }, [authStatus, initializeRuntimeContext]);

    const localLoginVisible = (
        authRuntimeMode === 'local-personal-number'
        && [
            'local-login-required',
            'obtaining-token',
            'expired'
        ].includes(authStatus)
    );

    if (localLoginVisible) {
        if (!localUi?.LocalDevelopmentLogin) return <LoadingGate />;
        return (
            <localUi.LocalDevelopmentLogin
                busy={authStatus === 'obtaining-token'}
                error={authError}
                onLogin={loginLocally}
            />
        );
    }

    if (authStatus === 'initializing') return <LoadingGate />;
    if (authStatus !== 'authenticated') {
        return (
            <ErrorGate
                message={authError || 'ההתחברות אינה זמינה.'}
                onRetry={() => initializeRuntimeContext({ force: true })}
            />
        );
    }

    const showSidebar = hasSelectedRoom && ![
        'hierarchy',
        'user_management',
        'access_requests'
    ].includes(currentView);
    const isSuperAdminView = currentView === 'super_admin';
    const contextLoading = hierarchyStatus === 'loading';
    const LocalSessionResetButton = localUi?.LocalSessionResetButton;

    return (
        <div
            className={`tamar-v22-app-viewport inquiry-page-surface flex h-screen w-full overflow-hidden font-sans`}
            dir="rtl"
        >
            {showEnvModal && (
                <EnvironmentSelectionModal
                    environments={organizationHierarchy.environments}
                    rooms={organizationHierarchy.rooms}
                    loading={contextLoading}
                    error={authError || hierarchyError}
                    onRetry={() => initializeRuntimeContext({
                        force: true
                    })}
                    onConfirm={confirmEnvironment}
                    onClose={closeEnvironmentModal}
                />
            )}

            {showSidebar && (
                <Sidebar
                    currentView={currentView}
                    navItems={navItems}
                    onNavigate={navigate}
                    variant={isSuperAdminView ? 'superAdmin' : 'default'}
                    onReturnToEnvironment={returnFromSuperAdmin}
                    currentUser={currentUser}
                />
            )}

            {!showSidebar && currentView !== 'hierarchy' && (
                <div className="app-shell-theme-control">
                    <ThemeControl />
                </div>
            )}

            <main className={`tamar-v22-app-main flex-1 flex h-full min-w-0 flex-col overflow-hidden bg-transparent relative ${showSidebar ? 'tamar-v22-shell-main' : ''}`}>
                <AppRoutes
                    currentView={currentView}
                    isSuperAdmin={isSuperAdmin}
                    canManageUsers={canManageUsers}
                    canManageSettings={canManageSettings}
                    onOpenEnvModal={openEnvironmentModal}
                    onOpenUserManagement={() => navigate(
                        'user_management'
                    )}
                    onRoomSelect={selectRoom}
                />
            </main>

            <GlobalToastViewport />

            {authRuntimeMode === 'local-personal-number'
                && LocalSessionResetButton
                && (
                    <LocalSessionResetButton
                        onReset={resetLocalSession}
                    />
                )}
        </div>
    );
}

export default AppShell;
