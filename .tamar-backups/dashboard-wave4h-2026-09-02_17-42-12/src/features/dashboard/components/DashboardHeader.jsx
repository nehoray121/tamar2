import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({
    totalInquiries,
    onEdit,
    onCreateInquiry
}) => (
    <header className="dashboard-v4g-header" dir="rtl">
        <div className="dashboard-v4g-header__titles">
            <div className="dashboard-v4g-header__title-row">
                <span className="dashboard-v4g-header__mark" aria-hidden="true">
                    <Icon name="dashboard" className="h-4 w-4" />
                </span>
                <h1 className="dashboard-v4g-header__title">דשבורד</h1>
            </div>
            <p className="dashboard-v4g-header__subtitle">
                {totalInquiries} פניות במערכת · מבט ניהולי כולל
            </p>
        </div>

        <div className="dashboard-v4g-header__actions">
            <button
                type="button"
                onClick={onEdit}
                className="dashboard-v4g-btn dashboard-v4g-btn--secondary"
            >
                <Icon name="edit" className="h-3.5 w-3.5" />
                עריכת מדדים
            </button>

            <button
                type="button"
                onClick={onCreateInquiry}
                className="dashboard-v4g-btn dashboard-v4g-btn--primary"
            >
                <Icon name="filePlus" className="h-3.5 w-3.5" />
                פנייה חדשה
            </button>
        </div>
    </header>
);

export default DashboardHeader;
