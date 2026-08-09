import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import DashboardKpiCard from './DashboardKpiCard.jsx';

const DashboardKpiGrid = ({ fullSectionExpansion, selectedKpis, onEdit, onRemove }) => (
    <div className={`dashboard-motion overflow-hidden ${fullSectionExpansion ? 'pointer-events-none mb-0 max-h-0 -translate-y-2 opacity-0' : 'mb-1.5 max-h-[118px] shrink-0 translate-y-0 opacity-100'}`}>
        <div className="grid h-[clamp(106px,11vh,114px)] grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
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
                    className="theme-add-card group flex h-[clamp(106px,11vh,114px)] min-h-[106px] flex-col items-center justify-center rounded-[18px] border-2 border-dashed shadow-[0_8px_18px_rgba(59,130,246,0.05)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
                >
                    <span className="theme-add-card__icon flex h-6 w-6 items-center justify-center rounded-xl transition">
                        <Icon name="plus" className="h-3 w-3" />
                    </span>
                    <span className="mt-1 text-[11px] font-black">הוסף כרטיס</span>
                </button>
            )}
        </div>
    </div>
);

export default DashboardKpiGrid;
