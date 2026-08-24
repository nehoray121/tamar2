import React from 'react';
import Icon from '../components/common/Icon.jsx';
import AccessRequestsPage from '../pages/AccessRequestsPage/AccessRequestsPage.jsx';
import DashboardPage from '../pages/DashboardPage/index.js';
import ExternalInquiriesPage from '../pages/ExternalInquiriesPage/index.js';
import HierarchyPage from '../pages/HierarchyPage/index.js';
import InquiryHistoryPage from '../pages/InquiryHistoryPage/index.js';
import MyTasksPage from '../pages/MyTasksPage/index.js';
import NewInquiryPage from '../pages/NewInquiryPage/index.js';
import OpenInquiriesPage from '../pages/OpenInquiriesPage/index.js';
import SettingsPage from '../pages/SettingsPage/index.js';
import SuperAdminPage from '../pages/SuperAdminPage/index.js';
import UserManagementPage from '../pages/UserManagementPage/index.js';

const ForbiddenSuperAdmin = () => (
    <div className="inquiry-page-surface flex h-full items-center justify-center p-6" dir="rtl">
        <section className="max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-6 text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><Icon name="shield" className="h-6 w-6" /></span>
            <h1 className="text-xl font-black text-[var(--color-text-primary)]">אין הרשאה למרכז השליטה</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">גישה לאזור זה מותרת למנהל-על בלבד.</p>
        </section>
    </div>
);

const ForbiddenUserManagement = () => (
    <div className="inquiry-page-surface flex h-full items-center justify-center p-6" dir="rtl">
        <section className="max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-6 text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><Icon name="users" className="h-6 w-6" /></span>
            <h1 className="text-xl font-black text-[var(--color-text-primary)]">אין הרשאה לניהול משתמשים</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">ניהול משתמשים זמין רק למנהלים בעלי סמכות פעילה בתחום הארגוני שלהם.</p>
        </section>
    </div>
);

function AppRoutes({ currentView, isSuperAdmin, canManageUsers, onOpenEnvModal, onOpenUserManagement, onRoomSelect }) {
    switch (currentView) {
        case 'access_requests': return <AccessRequestsPage />;
        case 'hierarchy': return <HierarchyPage onOpenEnvModal={onOpenEnvModal} onOpenUserManagement={onOpenUserManagement} onRoomSelect={onRoomSelect} />;
        case 'user_management': return canManageUsers ? <UserManagementPage /> : <ForbiddenUserManagement />;
        case 'dashboard': return <DashboardPage />;
        case 'super_admin': return isSuperAdmin ? <SuperAdminPage /> : <ForbiddenSuperAdmin />;
        case 'new_complaint': return <NewInquiryPage />;
        case 'settings': return <SettingsPage />;
        case 'my_tasks': return <MyTasksPage />;
        case 'open_complaints': return <OpenInquiriesPage />;
        case 'history': return <InquiryHistoryPage />;
        case 'external': return <ExternalInquiriesPage />;
        default: return <div className="p-8 font-bold text-gray-500">אין תצוגה זמינה</div>;
    }
}

export default AppRoutes;
