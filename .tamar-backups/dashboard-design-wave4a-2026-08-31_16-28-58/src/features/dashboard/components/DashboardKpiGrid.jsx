import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import DashboardKpiCard from './DashboardKpiCard.jsx';

const DashboardKpiGrid = ({ fullSectionExpansion, selectedKpis, onEdit, onRemove }) => {
    const hasClosureRate = selectedKpis.some((kpi) => (
        kpi.id === 'closureRate'
        || kpi.id === 'closure_rate'
        || kpi.title === 'אחוז סגירה'
    ));

    return (
        <div className={`tamar-v22-kpi-grid dashboard-motion overflow-hidden ${fullSectionExpansion ? 'pointer-events-none mb-0 max-h-0 -translate-y-2 opacity-0' : 'mb-3 shrink-0 translate-y-0 opacity-100'}`}>
            <div className="tamar-v22-kpi-grid-inner grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
                {selectedKpis.map((kpi, index) => {
                    const isClosureRate = (
                        kpi.id === 'closureRate'
                        || kpi.id === 'closure_rate'
                        || kpi.title === 'אחוז סגירה'
                    );
                    const featured = isClosureRate || (!hasClosureRate && index === 0);

                    return (
                        <DashboardKpiCard
                            key={kpi.id}
                            {...kpi}
                            featured={featured}
                            actionIcon="minus"
                            actionLabel={`הסר כרטיס ${kpi.title}`}
                            onAction={() => onRemove(kpi.id)}
                        />
                    );
                })}

                {selectedKpis.length < 6 && (
                    <button
                        type="button"
                        onClick={onEdit}
                        aria-label="הוסף כרטיס"
                        className="tamar-v22-add-kpi theme-add-card group flex flex-col items-center justify-center border-2 border-dashed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                    >
                        <span className="theme-add-card__icon flex h-7 w-7 items-center justify-center rounded-xl">
                            <Icon name="plus" className="h-3.5 w-3.5" />
                        </span>
                        <span className="mt-1 text-[11px] font-bold">הוסף כרטיס</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default DashboardKpiGrid;
