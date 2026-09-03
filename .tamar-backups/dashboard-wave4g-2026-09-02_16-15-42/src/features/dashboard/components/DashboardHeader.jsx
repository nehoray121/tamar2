import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({
    totalInquiries,
    onEdit,
    onCreateInquiry
}) => (
    <header className="dashboard-header-v4b" dir="rtl">
        <div className="dashboard-header-v4b__text">
            <span className="dashboard-header-v4b__icon" aria-hidden="true">
                <Icon name="dashboard" className="h-[17px] w-[17px]" />
            </span>

            <div className="dashboard-header-v4b__titles">
                <h1 className="dashboard-header-v4b__title">דשבורד</h1>
                <p className="dashboard-header-v4b__subtitle">מבט ניהולי כולל</p>
            </div>
        </div>

        <div className="dashboard-header-v4b__actions">
            <span className="dashboard-count-chip-v4b">
                <span>סה״כ פניות</span>
                <strong>{totalInquiries}</strong>
            </span>

            <button
                type="button"
                onClick={onEdit}
                className="tamar-ui-btn tamar-ui-btn--secondary"
            >
                <Icon name="dashboard" className="h-3.5 w-3.5" />
                עריכת מדדים
            </button>

            <button
                type="button"
                onClick={onCreateInquiry}
                className="tamar-ui-btn tamar-ui-btn--primary"
            >
                <Icon name="filePlus" className="h-3.5 w-3.5" />
                פנייה חדשה
            </button>
        </div>
    </header>
);

export default DashboardHeader;
