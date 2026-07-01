import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

        const DashboardBadge = ({ children, className = '' }) => (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>{children}</span>
        );

        const DashboardCard = ({ children, className = '' }) => (
            <section className={`relative min-h-0 overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ${className}`}>
                <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
            </section>
        );

        const DashboardToolbarPill = ({ children, className = '' }) => (
            <div className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100/70 ${className}`}>
                {children}
            </div>
        );

        const DashboardSegmentedButton = ({ label, isActive, onClick }) => (
            <button
                type="button"
                onClick={onClick}
                className={`rounded-xl px-4 py-2 text-sm font-black transition-all active:scale-95 ${
                    isActive
                        ? 'bg-gradient-to-l from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                {label}
            </button>
        );

        const DashboardSelectPill = ({ label, icon, value, onChange, options }) => (
            <DashboardToolbarPill>
                <Icon name={icon} className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap text-xs font-black text-slate-500">{label}</span>
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-w-[132px] cursor-pointer border-0 bg-transparent text-sm font-black text-slate-800 outline-none"
                >
                    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Icon name="chevronDown" className="w-3.5 h-3.5 text-slate-400" />
            </DashboardToolbarPill>
        );

        const DashboardDateInput = ({ label, value, onChange }) => (
            <DashboardToolbarPill>
                <Icon name="calendar" className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap text-xs font-black text-slate-500">{label}</span>
                <input
                    type="date"
                    value={value}
                    onInput={(event) => onChange(event.target.value)}
                    onChange={(event) => onChange(event.target.value)}
                    className="cursor-pointer border-0 bg-transparent text-sm font-black text-slate-800 outline-none"
                />
            </DashboardToolbarPill>
        );

export { DashboardBadge, DashboardCard, DashboardToolbarPill, DashboardSegmentedButton, DashboardSelectPill, DashboardDateInput };
