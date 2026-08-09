import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardDateInput, DashboardSegmentedButton, DashboardSelectPill } from './DashboardPrimitives.jsx';

        const DashboardFilterToolbar = ({ isExpanded, filters, setFilters, categoryOptions, sortOptions, onExport }) => (
            <div className={`grid transition-all duration-500 ${isExpanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="min-h-0 overflow-hidden">
                    <div className="rounded-[24px] border border-blue-100 bg-slate-50/90 px-3 py-2.5 shadow-inner sm:px-4 sm:py-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-100">
                                <Icon name="filter" className="w-4 h-4 text-blue-600" />
                                מסנני תצוגה מתקדמים
                            </div>
                              <button
                                type="button"
                                onClick={onExport}
                                className="sm:mr-auto flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md"
                            >
                                <Icon name="arrowDownStraight" className="w-4 h-4" />
                                הורדת קובץ Excel
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                                <DashboardSegmentedButton label="יומי" isActive={filters.grouping === 'daily'} onClick={() => setFilters(current => ({ ...current, grouping: 'daily' }))} />
                                <DashboardSegmentedButton label="שבועי" isActive={filters.grouping === 'weekly'} onClick={() => setFilters(current => ({ ...current, grouping: 'weekly' }))} />
                                <DashboardSegmentedButton label="חודשי" isActive={filters.grouping === 'monthly'} onClick={() => setFilters(current => ({ ...current, grouping: 'monthly' }))} />
                            </div>
                            <DashboardDateInput label="מתאריך" value={filters.dateFrom} onChange={(value) => setFilters(current => ({ ...current, dateFrom: value }))} />
                            <DashboardDateInput label="עד תאריך" value={filters.dateTo} onChange={(value) => setFilters(current => ({ ...current, dateTo: value }))} />
                            <DashboardSelectPill label="קטגוריה" icon="filter" value={filters.category} onChange={(value) => setFilters(current => ({ ...current, category: value }))} options={categoryOptions} />
                            <DashboardSelectPill label="מיון" icon="arrowDownUp" value={filters.sortOrder} onChange={(value) => setFilters(current => ({ ...current, sortOrder: value }))} options={sortOptions} />
                          
                        </div>
                    </div>
                </div>
            </div>
        );

export default DashboardFilterToolbar;
