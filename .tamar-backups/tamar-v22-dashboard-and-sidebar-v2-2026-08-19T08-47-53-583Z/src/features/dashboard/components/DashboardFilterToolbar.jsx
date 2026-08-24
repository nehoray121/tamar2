import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardDateInput, DashboardSegmentedButton, DashboardSelectPill } from './DashboardPrimitives.jsx';

// tamar-dashboard-filter-layout:v2
const DashboardFilterToolbar = ({ isExpanded, filters, setFilters, categoryOptions, sortOptions, onExport }) => (
    <div className={`tamar-reference-filter-toolbar grid transition-all duration-300 ${isExpanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-visible">
            <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-3 shadow-inner sm:px-4">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="inquiry-control flex min-h-[38px] items-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-black text-[var(--color-text-primary)]">
                        <Icon name="filter" className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                        מסנני תצוגה מתקדמים
                    </div>
                    <button
                        type="button"
                        onClick={onExport}
                        className="inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-2xl border border-emerald-300/60 bg-emerald-500/10 px-3 py-2 text-[12px] font-black text-emerald-600 transition hover:bg-emerald-500/15 dark:border-emerald-400/30 dark:text-emerald-300"
                    >
                        <Icon name="arrowDownStraight" className="h-4 w-4" />
                        הורדת קובץ Excel
                    </button>
                </div>

                <div className="grid min-w-0 grid-cols-1 items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {filters.category === 'period' ? (
                        <div className="flex min-h-[42px] w-full min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 shadow-sm">
                            <DashboardSegmentedButton label="יומי" isActive={filters.grouping === 'daily'} onClick={() => setFilters((current) => ({ ...current, grouping: 'daily' }))} />
                            <DashboardSegmentedButton label="שבועי" isActive={filters.grouping === 'weekly'} onClick={() => setFilters((current) => ({ ...current, grouping: 'weekly' }))} />
                            <DashboardSegmentedButton label="חודשי" isActive={filters.grouping === 'monthly'} onClick={() => setFilters((current) => ({ ...current, grouping: 'monthly' }))} />
                        </div>
                    ) : (
                        <div className="inquiry-control flex min-h-[42px] w-full min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-black text-[var(--color-text-secondary)]">
                            <Icon name="chartBar" className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                            <span className="truncate">העמודות מקובצות לפי ערכי השדה שנבחר</span>
                        </div>
                    )}
                    <DashboardDateInput label="מתאריך" value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} />
                    <DashboardDateInput label="עד תאריך" value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} />
                    <DashboardSelectPill label="קטגוריה" icon="filter" value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} options={categoryOptions} />
                    <DashboardSelectPill label="מיון" icon="arrowDownUp" value={filters.sortOrder} onChange={(value) => setFilters((current) => ({ ...current, sortOrder: value }))} options={sortOptions} />
                </div>
            </div>
        </div>
    </div>
);

export default DashboardFilterToolbar;
