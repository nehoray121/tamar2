import { create } from 'zustand';

export const useSessionStore = create((set) => ({
    hasSelectedEnv: false,
    hasSelectedRoom: false,
    currentView: 'hierarchy',
    showEnvModal: true,
    isAdmin: true,
    confirmEnvironment: () => set({
        hasSelectedEnv: true,
        showEnvModal: false,
        currentView: 'hierarchy',
        hasSelectedRoom: false
    }),
    selectRoom: () => set({
        hasSelectedRoom: true,
        currentView: 'dashboard'
    }),
    navigate: (id) => set((state) => ({
        currentView: id,
        hasSelectedRoom: id === 'hierarchy' ? false : state.hasSelectedRoom
    })),
    openEnvironmentModal: () => set({ showEnvModal: true }),
    closeEnvironmentModal: () => set((state) => state.hasSelectedEnv ? { showEnvModal: false } : {})
}));
