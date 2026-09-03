import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardBadge = ({ children, className = '', style }) => (
    <span style={style} className={`dashboard-badge-v4a ${className}`}>
        {children}
    </span>
);

const DashboardCard = ({ children, className = '', ...props }) => (
    <section className={`dashboard-card-v4a ${className}`} {...props}>
        <div className="dashboard-card-v4a__body">{children}</div>
    </section>
);

const DashboardToolbarPill = ({ children, className = '' }) => (
    <div className={`dashboard-toolbar-pill-v4a ${className}`}>
        {children}
    </div>
);

const DashboardSegmentedButton = ({ label, isActive, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="dashboard-segmented-option-v4a"
        data-active={isActive ? 'true' : 'false'}
    >
        {label}
    </button>
);

const DashboardSelectPill = ({ label, icon, value, onChange, options }) => (
    <DashboardToolbarPill className="dashboard-select-pill-v4a">
        <Icon name={icon} className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
        <span className="dashboard-toolbar-pill-v4a__label">{label}</span>
        <div className="dashboard-select-wrap-v4a">
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="dashboard-select-input-v4a"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <span className="dashboard-select-chevron-v4a" aria-hidden="true">
                <Icon name="chevronDown" className="h-3 w-3" />
            </span>
        </div>
    </DashboardToolbarPill>
);

const DashboardDateInput = ({ label, value, onChange }) => (
    <DashboardToolbarPill>
        <Icon name="calendar" className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
        <span className="dashboard-toolbar-pill-v4a__label">{label}</span>
        <input
            type="date"
            value={value}
            onInput={(event) => onChange(event.target.value)}
            onChange={(event) => onChange(event.target.value)}
            className="dashboard-date-input-v4a"
        />
    </DashboardToolbarPill>
);

export {
    DashboardBadge,
    DashboardCard,
    DashboardToolbarPill,
    DashboardSegmentedButton,
    DashboardSelectPill,
    DashboardDateInput
};
