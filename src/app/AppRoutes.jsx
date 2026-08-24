import React from 'react';
import DashboardPage from '../pages/DashboardPage/DashboardPage.jsx';
import ExternalInquiriesPage from '../pages/ExternalInquiriesPage/ExternalInquiriesPage.jsx';
import HierarchyPage from '../pages/HierarchyPage/HierarchyPage.jsx';
import InquiryHistoryPage from '../pages/InquiryHistoryPage/InquiryHistoryPage.jsx';
import MyTasksPage from '../pages/MyTasksPage/MyTasksPage.jsx';
import NewInquiryPage from '../pages/NewInquiryPage/NewInquiryPage.jsx';
import OpenInquiriesPage from '../pages/OpenInquiriesPage/OpenInquiriesPage.jsx';
import SettingsPage from '../pages/SettingsPage/SettingsPage.jsx';
import SuperAdminPage from '../pages/SuperAdminPage/SuperAdminPage.jsx';
import UserManagementPage from '../pages/UserManagementPage/UserManagementPage.jsx';
import AccessRequestsPage from '../pages/AccessRequestsPage/AccessRequestsPage.jsx';

const ForbiddenState = ({ title = 'אין הרשאה', message }) => (
    <div
        className="inquiry-page-surface flex h-full items-center justify-center p-6"
        dir="rtl"
    >
        <section
            role="alert"
            className="max-w-lg rounded-2xl border border-red-300/40 bg-red-500/10 p-6 text-center"
        >
            <h1 className="text-xl font-black text-[var(--color-text-primary)]">
                {title}
            </h1>
            <p className="mt-2 text-sm font-semibold text-[var(--color-text-secondary)]">
                {message}
            </p>
        </section>
    </div>
);

const AppRoutes = ({
    currentView,
    isSuperAdmin,
    canManageUsers,
    canManageSettings,
    onOpenEnvModal,
    onOpenUserManagement,
    onRoomSelect
}) => {
    switch (currentView) {
        case 'super_admin':
            return isSuperAdmin
                ? <SuperAdminPage />
                : (
                    <ForbiddenState
                        message="מרכז השליטה זמין למנהלי־על בלבד."
                    />
                );

        case 'access_requests':
            return <AccessRequestsPage />;

        case 'hierarchy':
            return (
                <HierarchyPage
                    onOpenEnvModal={onOpenEnvModal}
                    onOpenUserManagement={onOpenUserManagement}
                    onRoomSelect={onRoomSelect}
                />
            );

        case 'dashboard':
            return <DashboardPage />;

        case 'new_complaint':
            return <NewInquiryPage />;

        case 'my_tasks':
            return <MyTasksPage />;

        case 'open_complaints':
            return <OpenInquiriesPage />;

        case 'history':
            return <InquiryHistoryPage />;

        case 'external':
            return <ExternalInquiriesPage />;

        case 'settings':
            return canManageSettings
                ? <SettingsPage />
                : (
                    <ForbiddenState
                        message="משתמש חדר רגיל אינו רשאי לשנות את הגדרות החדר."
                    />
                );

        case 'user_management':
            return canManageUsers
                ? <UserManagementPage />
                : (
                    <ForbiddenState
                        message="ניהול משתמשים זמין לבעלי תפקיד ניהולי בלבד."
                    />
                );

        default:
            return <DashboardPage />;
    }
};

export default AppRoutes;
