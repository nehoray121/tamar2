import React from 'react';

const DashboardHeader = ({ totalInquiries }) => (
    <header className="tamar-v22-dashboard-header flex shrink-0 items-start justify-between gap-4">
        <div className="text-right">
            <h1>לוח בקרה</h1>
            <p>מעקב, תעדוף וניהול הפניות שלך במקום אחד.</p>
        </div>

        <div className="tamar-v22-dashboard-total" aria-label={`סה״כ פניות ${totalInquiries}`}>
            <span>סה״כ פניות</span>
            <strong>{totalInquiries}</strong>
        </div>
    </header>
);

export default DashboardHeader;
