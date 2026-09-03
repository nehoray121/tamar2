import React from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';

const DashboardBadge = ({ children, className = '', style }) => (
    <span style={style} className={`tamar-claude-badge ${className}`}>
        {children}
    </span>
);

const DashboardCard = ({ children, className = '', ...props }) => (
    <section className={`tamar-claude-card ${className}`} {...props}>
        {children}
    </section>
);

const DashboardToolbarPill = ({ children, className = '' }) => (
    <div className={`tamar-claude-toolbar-pill ${className}`}>
        {children}
    </div>
);

const DashboardSegmentedButton = ({ label, isActive, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="tamar-claude-segmented__option"
        data-active={isActive ? 'true' : 'false'}
    >
        {label}
    </button>
);

const DashboardSelectPill = ({ label, icon, value, onChange, options }) => (
    <DashboardToolbarPill className="tamar-claude-select-pill">
        <Icon name={icon} className="h-3.5 w-3.5 shrink-0" />
        <span className="tamar-claude-toolbar-pill__label">{label}</span>
        <div className="tamar-claude-select-wrap">
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="tamar-claude-select-input"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <span className="tamar-claude-select-chevron" aria-hidden="true">
                <Icon name="chevronDown" className="h-3 w-3" />
            </span>
        </div>
    </DashboardToolbarPill>
);

const DashboardDateInput = ({ label, value, onChange }) => (
    <DashboardToolbarPill>
        <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
        <span className="tamar-claude-toolbar-pill__label">{label}</span>
        <input
            type="date"
            value={value}
            onInput={(event) => onChange(event.target.value)}
            onChange={(event) => onChange(event.target.value)}
            className="tamar-claude-date-input"
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
