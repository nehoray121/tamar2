import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

        const DashboardBadge = ({ children, className = '', style }) => (
            <span style={style} className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>{children}</span>
        );

        const DashboardCard = ({ children, className = '' }) => (
            <section className={`inquiry-panel relative min-h-0 overflow-hidden rounded-[24px] !shadow-none ${className}`}>
                <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
            </section>
        );

        const DashboardToolbarPill = ({ children, className = '' }) => (
            <div className={`dashboard-toolbar-pill inquiry-control flex w-full min-w-0 items-center gap-2 rounded-2xl px-3 py-2 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100/70 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-500/30 ${className}`}>
                {children}
            </div>
        );

        const DashboardSegmentedButton = ({ label, isActive, onClick }) => (
            <button
                type="button"
                onClick={onClick}
                className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-sm font-black transition-all active:scale-95 ${
                    isActive
                        ? 'bg-gradient-to-l from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                        : 'inquiry-muted-text hover:inquiry-panel hover:text-[var(--color-text-primary)]'
                }`}
            >
                {label}
            </button>
        );

        const DashboardSelectPill = ({ label, icon, value, onChange, options }) => (
            <DashboardToolbarPill>
                <Icon name={icon} className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap text-xs font-black inquiry-secondary-text">{label}</span>
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-sm font-black inquiry-primary-text outline-none"
                >
                    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Icon name="chevronDown" className="w-3.5 h-3.5 inquiry-muted-text" />
            </DashboardToolbarPill>
        );

        const DashboardDateInput = ({ label, value, onChange }) => (
            <DashboardToolbarPill>
                <Icon name="calendar" className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap text-xs font-black inquiry-secondary-text">{label}</span>
                <input
                    type="date"
                    value={value}
                    onInput={(event) => onChange(event.target.value)}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-sm font-black inquiry-primary-text outline-none"
                />
            </DashboardToolbarPill>
        );

export { DashboardBadge, DashboardCard, DashboardToolbarPill, DashboardSegmentedButton, DashboardSelectPill, DashboardDateInput };
