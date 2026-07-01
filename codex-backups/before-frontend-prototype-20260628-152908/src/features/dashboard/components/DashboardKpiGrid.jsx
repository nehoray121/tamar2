import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import DashboardKpiCard from './DashboardKpiCard.jsx';

const DashboardKpiGrid = ({ fullSectionExpansion, selectedKpis, onEdit, onRemove }) => (
    <div className={`dashboard-motion overflow-hidden ${fullSectionExpansion ? 'mb-0 max-h-0 -translate-y-2 opacity-0 pointer-events-none' : 'mb-2.5 max-h-[132px] translate-y-0 opacity-100 shrink-0'}`}>
        <div className="grid h-[clamp(104px,12vh,118px)] grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6 lg:gap-3">
            {selectedKpis.map((kpi) => (
                <DashboardKpiCard
                    key={kpi.id}
                    {...kpi}
                    actionIcon="minus"
                    actionLabel={`הסר כרטיס ${kpi.title}`}
                    onAction={() => onRemove(kpi.id)}
                />
            ))}
            {selectedKpis.length < 6 && (
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label="הוסף כרטיס"
                    className="group flex h-[clamp(104px,12vh,118px)] min-h-[104px] flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-blue-200 bg-[#F8FBFF]/90 text-blue-500 shadow-[0_12px_28px_rgba(59,130,246,0.06)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-[#F2F8FF] hover:shadow-[0_18px_34px_rgba(59,130,246,0.10)]"
                >
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm transition group-hover:border-blue-200 group-hover:bg-blue-50">
                        <Icon name="plus" className="h-4 w-4" />
                    </span>
                    <span className="mt-2 text-xs font-black">הוסף כרטיס</span>
                </button>
            )}
        </div>
    </div>
);

export default DashboardKpiGrid;
