import { create } from 'zustand';
import { getRuntimeAuthentication } from '../features/auth/runtimeAuthentication.js';
import { loadRuntimeOrganizationContext } from '../features/rooms/services/runtimeOrganizationApi.js';
import { closeBoardSocket } from '../features/tickets/boards/realtime/boardSocket.js';

const isBrowser = typeof window !== 'undefined';
const selectionStorageKey = 'tamar:canonical-room-context:v1';
const getInitialView = () => (isBrowser && window.location.pathname.startsWith('/super-admin') ? 'super_admin' : 'hierarchy');
const initialView = getInitialView();
const defaultReturnView = initialView === 'super_admin' ? 'dashboard' : initialView;
const safeReturnViews = new Set([
    'hierarchy',
    'access_requests',
    'dashboard',
    'new_complaint',
    'my_tasks',
    'open_complaints',
    'history',
    'external',
    'settings'
]);

const syncViewUrl = (id) => {
    if (!isBrowser) return;
    if (id === 'super_admin') {
        const target = window.location.pathname.startsWith('/super-admin') ? `${window.location.pathname}${window.location.search}` : '/super-admin/overview';
        window.history.pushState({ view: 'super_admin' }, '', target);
    } else if (window.location.pathname.startsWith('/super-admin')) {
        window.history.pushState({ view: id }, '', '/');
    }
};

const emptyHierarchy = Object.freeze({
    systems: [],
    environments: [],
    subEnvironments: [],
    rooms: []
});

const readStoredSelection = () => {
    if (!isBrowser || !window.sessionStorage) return null;
    try {
        const value = JSON.parse(window.sessionStorage.getItem(selectionStorageKey) || 'null');
        return value && typeof value === 'object' ? value : null;
    } catch {
        return null;
    }
};

const persistSelection = (environment, room) => {
    if (!isBrowser || !window.sessionStorage) return;
    if (!environment && !room) {
        window.sessionStorage.removeItem(selectionStorageKey);
        return;
    }
    window.sessionStorage.setItem(selectionStorageKey, JSON.stringify({
        environmentId: environment?.id || null,
        roomId: room?.id || null
    }));
};

const findValidatedSelection = (hierarchy, selection) => {
    const room = hierarchy.rooms.find((item) => item.id === selection?.roomId) || null;
    const environmentId = room?.environmentId || selection?.environmentId;
    const environment = hierarchy.environments.find((item) => item.id === environmentId) || null;
    if (room && (!environment || room.environmentId !== environment.id)) return { environment: null, room: null };
    return { environment, room };
};

const localLoginError = (error) => {
    if (error?.code === 'LOCAL_PERSONAL_NUMBER_INVALID') return 'המספר האישי המקומי אינו בפורמט תקין.';
    if (error?.code === 'LOCAL_IDP_UNAVAILABLE') return 'שירות ההזדהות המקומי אינו זמין.';
    if (error?.code === 'LOCAL_RATE_LIMITED') return 'בוצעו ניסיונות רבים מדי. יש להמתין דקה ולנסות שוב.';
    return 'לא ניתן להפיק אסימון פיתוח מקומי מאובטח.';
};

const classifyAuthenticationFailure = (error, runtimeMode) => {
    if (error?.code === 'USER_DISABLED') {
        return { status: 'forbidden', message: 'המשתמש המחובר אינו פעיל במערכת תמר.' };
    }
    if (error?.code === 'AUTH_TOKEN_UNAVAILABLE') {
        return {
            status: runtimeMode === 'local-personal-number' ? 'local-login-required' : 'unavailable',
            message: runtimeMode === 'local-personal-number'
                ? ''
                : 'לא נמצא חיבור SSO ארגוני פעיל. יש להתחבר מחדש למערכת.'
        };
    }
    if (error?.status === 401) {
        return {
            status: 'expired',
            message: runtimeMode === 'local-personal-number'
                ? 'תוקף ההתחברות המקומית פג. יש להזין מחדש את מספר הפיתוח הסינתטי.'
                : 'תוקף ההתחברות הארגונית פג. יש להתחבר מחדש למערכת.'
        };
    }
    if (error?.status === 403) {
        return { status: 'forbidden', message: 'למשתמש המחובר אין הרשאה לפעולה זו.' };
    }
    return {
        status: 'failed',
        message: 'לא ניתן לאמת את ההתחברות כעת. יש לבדוק את החיבור ולנסות שוב.'
    };
};

let initializationPromise = null;
let initializationSequence = 0;

export const useSessionStore = create((set, get) => ({
    hasSelectedEnv: initialView === 'super_admin',
    hasSelectedRoom: initialView === 'super_admin',
    selectedEnvironment: null,
    selectedRoom: null,
    organizationHierarchy: emptyHierarchy,
    authRuntimeMode: 'unknown',
    authStatus: 'initializing',
    authError: '',
    hierarchyStatus: 'idle',
    hierarchyError: '',
    currentView: initialView,
    superAdminReturnView: defaultReturnView,
    showEnvModal: false,
    isAdmin: false,
    currentUser: null,
    memberships: [],
    capabilities: {},
    initializeRuntimeContext: ({ force = false, preserveAuthenticatedView = false } = {}) => {
        if (initializationPromise && !force) return initializationPromise;
        const sequence = ++initializationSequence;
        const preserveView = preserveAuthenticatedView && get().authStatus === 'authenticated';
        set({
            authStatus: preserveView ? 'authenticated' : 'initializing',
            authError: '',
            hierarchyStatus: preserveView ? 'loading' : 'idle',
            hierarchyError: '',
            ...(preserveView ? {} : { showEnvModal: false })
        });
        initializationPromise = getRuntimeAuthentication().then(async (runtime) => {
            if (sequence !== initializationSequence) return;
            set({ authRuntimeMode: runtime.mode });
            if (runtime.mode === 'local-personal-number' && !runtime.hasAccessToken()) {
                set({
                    authStatus: 'local-login-required',
                    hierarchyStatus: 'idle',
                    organizationHierarchy: emptyHierarchy
                });
                return;
            }

            set({ hierarchyStatus: 'loading' });
            const { authState, hierarchy } = await loadRuntimeOrganizationContext();
            if (sequence !== initializationSequence) return;

            if (authState.status !== 'AUTHORIZED') {
                const mayRequestAccess = authState.status === 'ACCESS_REQUEST_PENDING'
                    || (authState.status === 'ACCESS_REQUIRED' && ['NO_ACTIVE_MEMBERSHIPS', 'USER_NOT_PROVISIONED'].includes(authState.reason));
                if (mayRequestAccess) {
                    persistSelection(null, null);
                    set({
                        authStatus: 'authenticated',
                        authError: '',
                        hierarchyStatus: 'ready',
                        organizationHierarchy: emptyHierarchy,
                        currentUser: authState.user || authState.identity || null,
                        memberships: [],
                        capabilities: {},
                        isAdmin: false,
                        selectedEnvironment: null,
                        selectedRoom: null,
                        hasSelectedEnv: false,
                        hasSelectedRoom: false,
                        currentView: 'access_requests',
                        showEnvModal: false
                    });
                    return;
                }
                if (runtime.mode === 'local-personal-number' && authState.reason === 'USER_NOT_PROVISIONED') {
                    runtime.clear();
                    set({
                        authStatus: 'local-login-required',
                        authError: 'לא נמצא משתמש פיתוח תואם ב־tamar_dev.',
                        hierarchyStatus: 'idle',
                        organizationHierarchy: emptyHierarchy,
                        currentUser: null,
                        memberships: [],
                        capabilities: {},
                        isAdmin: false
                    });
                    return;
                }
                const message = 'למשתמש המחובר אין הרשאה פעילה במערכת תמר.';
                set({
                    authStatus: 'forbidden',
                    authError: message,
                    hierarchyStatus: 'ready',
                    organizationHierarchy: emptyHierarchy,
                    currentUser: authState.user || authState.identity || null,
                    memberships: [],
                    capabilities: {},
                    isAdmin: false
                });
                return;
            }

            const current = get();
            const currentSelection = {
                environmentId: current.selectedEnvironment?.id,
                roomId: current.selectedRoom?.id
            };
            const selection = findValidatedSelection(
                hierarchy,
                currentSelection.roomId ? currentSelection : readStoredSelection()
            );
            persistSelection(selection.environment, selection.room);
            const memberships = authState.memberships || [];
            const capabilities = authState.capabilities || {};
            set({
                authStatus: 'authenticated',
                authError: '',
                hierarchyStatus: 'ready',
                hierarchyError: '',
                organizationHierarchy: hierarchy,
                currentUser: authState.user || authState.identity || null,
                memberships,
                capabilities,
                isAdmin: Boolean(capabilities.manageSystem),
                selectedEnvironment: selection.environment,
                selectedRoom: selection.room,
                hasSelectedEnv: Boolean(selection.environment) || initialView === 'super_admin',
                hasSelectedRoom: Boolean(selection.room) || initialView === 'super_admin',
                showEnvModal: initialView !== 'super_admin' && !selection.environment
            });
        }).catch(async (error) => {
            if (sequence !== initializationSequence || error?.name === 'AbortError') return;
            const runtime = await getRuntimeAuthentication();
            const failure = classifyAuthenticationFailure(error, runtime.mode);
            if (runtime.mode === 'local-personal-number' && ['expired', 'local-login-required'].includes(failure.status)) {
                runtime.clear();
            }
            set({
                authRuntimeMode: runtime.mode,
                authStatus: failure.status,
                authError: failure.message,
                hierarchyStatus: 'error',
                hierarchyError: failure.message,
                organizationHierarchy: emptyHierarchy,
                currentUser: null,
                memberships: [],
                capabilities: {},
                isAdmin: false,
                showEnvModal: false
            });
        }).finally(() => {
            if (sequence === initializationSequence) initializationPromise = null;
        });
        return initializationPromise;
    },
    loginLocally: async (personalNumber) => {
        set({ authStatus: 'obtaining-token', authError: '', hierarchyError: '' });
        try {
            const runtime = await getRuntimeAuthentication();
            if (runtime.mode !== 'local-personal-number') throw Object.assign(new Error('Local mode is disabled'), { code: 'LOCAL_IDP_UNAVAILABLE' });
            await runtime.login(personalNumber);
            initializationPromise = null;
            await get().initializeRuntimeContext({ force: true });
            return get().authStatus === 'authenticated';
        } catch (error) {
            set({
                authStatus: 'local-login-required',
                authError: localLoginError(error),
                hierarchyStatus: 'idle',
                hierarchyError: ''
            });
            return false;
        }
    },
    resetLocalSession: async () => {
        const runtime = await getRuntimeAuthentication();
        if (runtime.mode !== 'local-personal-number') return;
        initializationSequence += 1;
        initializationPromise = null;
        runtime.clear();
        closeBoardSocket();
        persistSelection(null, null);
        syncViewUrl('hierarchy');
        set({
            authRuntimeMode: runtime.mode,
            authStatus: 'local-login-required',
            authError: '',
            hierarchyStatus: 'idle',
            hierarchyError: '',
            organizationHierarchy: emptyHierarchy,
            currentUser: null,
            memberships: [],
            capabilities: {},
            isAdmin: false,
            selectedEnvironment: null,
            selectedRoom: null,
            hasSelectedEnv: false,
            hasSelectedRoom: false,
            showEnvModal: false,
            currentView: 'hierarchy'
        });
    },
    confirmEnvironment: (environment) => set((state) => {
        const canonicalEnvironment = state.organizationHierarchy.environments.find((item) => item.id === environment?.id);
        if (!canonicalEnvironment) return {};
        const roomBelongsToEnvironment = state.selectedRoom?.environmentId === canonicalEnvironment.id;
        const selectedRoom = roomBelongsToEnvironment ? state.selectedRoom : null;
        persistSelection(canonicalEnvironment, selectedRoom);
        return {
            hasSelectedEnv: true,
            showEnvModal: false,
            currentView: 'hierarchy',
            hasSelectedRoom: Boolean(selectedRoom),
            selectedEnvironment: canonicalEnvironment,
            selectedRoom
        };
    }),
    selectRoom: (room) => set((state) => {
        const canonicalRoom = state.organizationHierarchy.rooms.find((item) => item.id === room?.id);
        if (!canonicalRoom) return {};
        const environment = state.organizationHierarchy.environments.find((item) => item.id === canonicalRoom.environmentId) || null;
        persistSelection(environment, canonicalRoom);
        return {
            hasSelectedEnv: Boolean(environment),
            hasSelectedRoom: true,
            currentView: 'dashboard',
            selectedEnvironment: environment,
            selectedRoom: canonicalRoom
        };
    }),
    navigate: (id) => set((state) => {
        syncViewUrl(id);
        const shouldStoreReturnView = id === 'super_admin' && safeReturnViews.has(state.currentView);
        return {
            currentView: id,
            superAdminReturnView: shouldStoreReturnView ? state.currentView : state.superAdminReturnView,
            hasSelectedRoom: id === 'super_admin' ? true : state.hasSelectedRoom,
            selectedRoom: state.selectedRoom,
            hasSelectedEnv: id === 'super_admin' ? true : state.hasSelectedEnv,
            showEnvModal: id === 'super_admin' ? false : state.showEnvModal
        };
    }),
    returnFromSuperAdmin: () => set((state) => {
        const fallbackView = state.hasSelectedRoom ? 'dashboard' : 'hierarchy';
        const nextView = safeReturnViews.has(state.superAdminReturnView) ? state.superAdminReturnView : fallbackView;
        syncViewUrl(nextView);
        return {
            currentView: nextView,
            showEnvModal: nextView === 'hierarchy' && !state.hasSelectedEnv,
            hasSelectedRoom: state.hasSelectedRoom
        };
    }),
    openEnvironmentModal: () => set({ showEnvModal: true }),
    closeEnvironmentModal: () => set((state) => state.hasSelectedEnv ? { showEnvModal: false } : {})
}));
