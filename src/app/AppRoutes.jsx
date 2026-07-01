import React from 'react';
import DashboardPage from '../pages/DashboardPage/index.js';
import ExternalInquiriesPage from '../pages/ExternalInquiriesPage/index.js';
import HierarchyPage from '../pages/HierarchyPage/index.js';
import InquiryHistoryPage from '../pages/InquiryHistoryPage/index.js';
import MyTasksPage from '../pages/MyTasksPage/index.js';
import NewInquiryPage from '../pages/NewInquiryPage/index.js';
import OpenInquiriesPage from '../pages/OpenInquiriesPage/index.js';
import SettingsPage from '../pages/SettingsPage/index.js';
import UserManagementPage from '../pages/UserManagementPage/index.js';

function AppRoutes({ currentView, onOpenEnvModal, onOpenUserManagement, onRoomSelect }) {
    switch (currentView) {
        case 'hierarchy': return <HierarchyPage onOpenEnvModal={onOpenEnvModal} onOpenUserManagement={onOpenUserManagement} onRoomSelect={onRoomSelect} />;
        case 'user_management': return <UserManagementPage />;
        case 'dashboard': return <DashboardPage />;
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
