import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({ totalInquiries, onCreateInquiry, onExport }) => (
    <header className="tamar-v22-dashboard-header flex shrink-0 items-start justify-between gap-5" aria-label={`לוח בקרה · ${totalInquiries} פניות`}>
        <div className="tamar-v22-dashboard-heading text-right">
            <h1>לוח בקרה</h1>
            <p>מעקב, תעדוף וניהול הפניות שלך במקום אחד.</p>
        </div>

        <div className="tamar-v22-dashboard-actions flex shrink-0 items-center gap-2.5">
            <button
                type="button"
                onClick={onCreateInquiry}
                className="tamar-v22-header-button tamar-v22-header-button--primary inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
                <Icon name="plus" className="h-4 w-4" />
                <span>פנייה חדשה</span>
            </button>
            <button
                type="button"
                onClick={onExport}
                className="tamar-v22-header-button tamar-v22-header-button--secondary inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
                <Icon name="arrowDownStraight" className="h-4 w-4" />
                <span>ייצוא לאקסל</span>
            </button>
        </div>
    </header>
);

export default DashboardHeader;
