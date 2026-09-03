import React from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';
import DashboardKpiCard from './DashboardKpiCard.jsx';

const DashboardKpiGrid = ({
    fullSectionExpansion,
    selectedKpis,
    onEdit,
    onRemove
}) => (
    <section
        className="tamar-claude-kpi-row"
        style={ {
            '--tamar-kpi-columns': Math.max(
                1,
                selectedKpis.length + (selectedKpis.length < 6 ? 1 : 0)
            )
        } }
        data-hidden={fullSectionExpansion ? 'true' : 'false'}
    >
        {selectedKpis.map((kpi, index) => (
            <DashboardKpiCard
                key={kpi.id}
                {...kpi}
                featured={index === 0}
                actionIcon="trash"
                actionLabel={`הסר כרטיס ${kpi.title}`}
                onAction={() => onRemove(kpi.id)}
            />
        ))}

        {selectedKpis.length < 6 && (
            <button
                type="button"
                onClick={onEdit}
                className="tamar-kpi-add-card"
                aria-label="הוסף מדד לדשבורד"
            >
                <span className="tamar-kpi-add-card__icon">
                    <Icon name="plus" className="h-4 w-4" />
                </span>

                <span className="tamar-kpi-add-card__copy">
                    <strong>הוסף מדד</strong>
                    <small>בחר מדד נוסף לדשבורד</small>
                </span>

                <span className="tamar-kpi-add-card__arrow" aria-hidden="true">
                    <Icon name="chevronLeft" className="h-3.5 w-3.5" />
                </span>
            </button>
        )}
    </section>
);

export default DashboardKpiGrid;
