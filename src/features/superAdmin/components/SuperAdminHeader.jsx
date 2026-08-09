import React from 'react';

const SuperAdminHeader = ({ scopeLabel }) => (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-2.5">
        <div>
            <h1 className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)]">מרכז שליטה מערכתי</h1>
            <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-text-secondary)]">תמונת מצב עבור {scopeLabel}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-[11px] font-black text-[var(--color-primary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
            מנהל־על
        </div>
    </header>
);

export default SuperAdminHeader;
