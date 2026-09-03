import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardBadge = ({ children, className = '', style }) => (
    <span style={style} className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>{children}</span>
);

const DashboardCard = ({ children, className = '' }) => (
    <section className={`tamar-v22-dashboard-card inquiry-panel relative min-h-0 overflow-hidden ${className}`}>
        <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
    </section>
);

const DashboardToolbarPill = ({ children, className = '' }) => (
    <div className={`tamar-v22-toolbar-pill dashboard-toolbar-pill inquiry-control flex w-full min-w-0 items-center gap-2 px-3 py-2 transition-all focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-soft)] ${className}`}>
        {children}
    </div>
);

const DashboardSegmentedButton = ({ label, isActive, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`tamar-v22-segmented-button min-w-0 flex-1 px-2 py-2 text-sm font-bold transition-all ${isActive ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'inquiry-muted-text hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]'}`}
    >
        {label}
    </button>
);

const DashboardSelectPill = ({ label, icon, value, onChange, options }) => (
    <DashboardToolbarPill className="dashboard-select-pill gap-2.5">
        <Icon name={icon} className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
        <span className="whitespace-nowrap text-xs font-bold inquiry-secondary-text">{label}</span>
        <div className="dashboard-select-shell min-w-0 flex-1">
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="dashboard-select-input app-select w-full min-w-[132px] cursor-pointer border-0 bg-transparent pe-2 ps-0 text-sm font-bold inquiry-primary-text outline-none"
            >
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <span className="dashboard-select-arrow" aria-hidden="true">
                <Icon name="chevronDown" className="h-3.5 w-3.5 inquiry-muted-text" />
            </span>
        </div>
    </DashboardToolbarPill>
);

const DashboardDateInput = ({ label, value, onChange }) => (
    <DashboardToolbarPill>
        <Icon name="calendar" className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
        <span className="whitespace-nowrap text-xs font-bold inquiry-secondary-text">{label}</span>
        <input
            type="date"
            value={value}
            onInput={(event) => onChange(event.target.value)}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-sm font-bold inquiry-primary-text outline-none"
        />
    </DashboardToolbarPill>
);

export { DashboardBadge, DashboardCard, DashboardToolbarPill, DashboardSegmentedButton, DashboardSelectPill, DashboardDateInput };
