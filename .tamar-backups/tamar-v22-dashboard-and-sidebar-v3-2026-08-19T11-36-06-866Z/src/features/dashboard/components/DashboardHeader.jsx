import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({ totalInquiries }) => (
    <header className="tamar-v22-dashboard-header tamar-reference-dashboard-header flex h-[72px] shrink-0 items-center justify-between px-5">
        <div className="tamar-reference-dashboard-heading flex items-center gap-3 text-right">
            <div className="tamar-reference-dashboard-heading-icon flex h-10 w-10 items-center justify-center rounded-[13px] text-[var(--color-primary)]">
                <Icon name="dashboard" className="h-[18px] w-[18px]" />
            </div>
            <div>
                <h1 className="text-[25px] font-black leading-8 tracking-tight text-[var(--color-text-primary)]">דשבורד פניות</h1>
                <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-text-secondary)]">מבט ניהולי כולל</p>
            </div>
        </div>

        <div className="tamar-reference-dashboard-total flex items-center gap-2 rounded-[12px] px-3.5 py-2 text-sm">
            <span className="font-medium text-[var(--color-text-secondary)]">סה״כ פניות</span>
            <span className="min-w-5 text-center font-bold text-[var(--color-primary)]">{totalInquiries}</span>
        </div>
    </header>
);

export default DashboardHeader;
