import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({
    totalInquiries,
    onEdit,
    onCreateInquiry
}) => (
    <header className="tamar-claude-page-header" dir="rtl">
        <div className="tamar-claude-page-header__text">
            <h1>דשבורד</h1>
            <p>{totalInquiries} פניות במערכת · מבט ניהולי כולל</p>
        </div>

        <div className="tamar-claude-page-header__actions">
            <button
                type="button"
                onClick={onEdit}
                className="tamar-claude-btn tamar-claude-btn--secondary"
            >
                <Icon name="edit" className="h-3.5 w-3.5" />
                עריכת מדדים
            </button>

            <button
                type="button"
                onClick={onCreateInquiry}
                className="tamar-claude-btn tamar-claude-btn--primary"
            >
                <Icon name="plus" className="h-3.5 w-3.5" />
                פנייה חדשה
            </button>
        </div>
    </header>
);

export default DashboardHeader;
