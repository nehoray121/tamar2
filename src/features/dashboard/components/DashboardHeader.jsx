import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardHeader = ({ totalInquiries }) => (
    <header className="flex h-[78px] shrink-0 items-center justify-between px-6 py-3">
        <div className="flex items-start gap-3 text-right">
            <div className="mt-1 rounded-xl bg-[var(--color-primary-soft)] p-2 text-[var(--color-primary)]">
                <Icon name="dashboard" className="h-4 w-4" />
            </div>
            <div>
                <h1 className="text-[26px] font-black leading-8 tracking-tight text-[var(--color-text-primary)]">דשבורד פניות</h1>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">מבט ניהולי כולל</p>
            </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-1.5 text-sm shadow-sm">
            <span className="font-medium text-[var(--color-text-secondary)]">סה״כ פניות:</span>
            <span className="font-bold text-[var(--color-primary)]">{totalInquiries}</span>
        </div>
    </header>
);

export default DashboardHeader;
