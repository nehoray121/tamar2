import React from 'react';
import AppRoutes from '../../app/AppRoutes.jsx';
import Sidebar from './Sidebar.jsx';
import { EnvironmentSelectionModal } from '../../pages/HierarchyPage/index.js';
import { useSessionStore } from '../../store/session.store.js';

const navItems = [
    { id: 'hierarchy', icon: 'dashboard', label: 'בחירת חדרים' },
    { id: 'dashboard', icon: 'trendUp', label: 'דשבורד' },
    { id: 'new_complaint', icon: 'filePlus', label: 'פנייה חדשה' },
    { id: 'my_tasks', icon: 'user', label: 'המשימות שלי' },
    { id: 'open_complaints', icon: 'globe', label: 'פניות פתוחות' },
    { id: 'history', icon: 'history', label: 'היסטוריית פניות' },
    { id: 'external', icon: 'link', label: 'פניות חיצוניות', badge: '0' },
    { id: 'settings', icon: 'settings', label: 'הגדרות מערכת' }
];

function AppShell() {
    const hasSelectedRoom = useSessionStore((state) => state.hasSelectedRoom);
    const currentView = useSessionStore((state) => state.currentView);
    const showEnvModal = useSessionStore((state) => state.showEnvModal);
    const isAdmin = useSessionStore((state) => state.isAdmin);
    const confirmEnvironment = useSessionStore((state) => state.confirmEnvironment);
    const selectRoom = useSessionStore((state) => state.selectRoom);
    const navigate = useSessionStore((state) => state.navigate);
    const openEnvironmentModal = useSessionStore((state) => state.openEnvironmentModal);
    const closeEnvironmentModal = useSessionStore((state) => state.closeEnvironmentModal);

    const showSidebar = hasSelectedRoom && currentView !== 'hierarchy' && currentView !== 'user_management';

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#F5F6FA] text-brand-text font-sans" dir="rtl">
            {showEnvModal && (
                <EnvironmentSelectionModal
                    onConfirm={confirmEnvironment}
                    onClose={closeEnvironmentModal}
                    isAdmin={isAdmin}
                />
            )}

            {showSidebar && (
                <Sidebar currentView={currentView} navItems={navItems} onNavigate={navigate} />
            )}

            <main className={`flex-1 flex h-full min-w-0 flex-col overflow-hidden bg-transparent relative ${showSidebar ? 'mr-64' : ''}`}>
                <AppRoutes
                    currentView={currentView}
                    onOpenEnvModal={openEnvironmentModal}
                    onOpenUserManagement={() => navigate('user_management')}
                    onRoomSelect={selectRoom}
                />
            </main>
        </div>
    );
}

export default AppShell;
