import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import DashboardKpiCard from './DashboardKpiCard.jsx';

const DashboardKpiGrid = ({
    fullSectionExpansion,
    selectedKpis,
    onEdit,
    onRemove
}) => (
    <section
        className="dashboard-v4g-kpi-row"
        data-hidden={fullSectionExpansion ? 'true' : 'false'}
        aria-hidden={fullSectionExpansion ? 'true' : undefined}
    >
        {selectedKpis.map((kpi, index) => (
            <DashboardKpiCard
                key={kpi.id}
                {...kpi}
                featured={index === 0}
                actionIcon="minus"
                actionLabel={`הסר כרטיס ${kpi.title}`}
                onAction={() => onRemove(kpi.id)}
            />
        ))}

        {selectedKpis.length < 6 && (
            <button
                type="button"
                onClick={onEdit}
                aria-label="הוסף מדד"
                className="dashboard-v4g-kpi-add"
            >
                <span className="dashboard-v4g-kpi-add__icon">
                    <Icon name="plus" className="h-3.5 w-3.5" />
                </span>
                <span>הוסף מדד</span>
            </button>
        )}
    </section>
);

export default DashboardKpiGrid;
