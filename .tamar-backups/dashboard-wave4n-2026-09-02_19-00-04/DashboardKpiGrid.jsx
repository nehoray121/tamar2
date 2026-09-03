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
        className="tamar-claude-kpi-row"
        data-hidden={fullSectionExpansion ? 'true' : 'false'}
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
                className="tamar-claude-kpi-add"
            >
                <Icon name="plus" className="h-4 w-4" />
                הוסף מדד
            </button>
        )}
    </section>
);

export default DashboardKpiGrid;
