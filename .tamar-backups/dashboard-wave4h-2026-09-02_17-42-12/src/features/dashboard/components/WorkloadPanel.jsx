import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const WorkloadPanel = ({ rows = [], expanded, onToggle }) => {
    const visibleRows = expanded ? rows : rows.slice(0, 4);
    const maxTotal = Math.max(
        ...rows.map((row) => Number(row.total || 0)),
        1
    );

    return (
        <DashboardCard
            className={`dashboard-v4g-workload ${
                expanded ? 'dashboard-v4g-workload--expanded' : ''
            }`}
            dir="rtl"
        >
            <header className="dashboard-v4g-card-header">
                <div className="dashboard-v4g-card-header__main">
                    <span className="dashboard-v4g-icon-chip">
                        <Icon name="user" className="h-[15px] w-[15px]" />
                    </span>

                    <div className="dashboard-v4g-card-header__titles">
                        <h2 className="dashboard-v4g-card-header__title">
                            עומס נציגים
                        </h2>
                        <p className="dashboard-v4g-card-header__subtitle">
                            חלוקת עומס לפי נציג בחדר
                        </p>
                    </div>
                </div>

                <SectionExpandButton
                    expanded={expanded}
                    onClick={onToggle}
                    compact
                    title={expanded ? 'מזער עומס נציגים' : 'הרחב עומס נציגים'}
                />
            </header>

            {visibleRows.length === 0 ? (
                <div className="dashboard-v4g-empty">
                    <span className="dashboard-v4g-empty__icon">
                        <Icon name="user" className="h-4 w-4" />
                    </span>
                    <strong>אין נציגים משויכים לחדר</strong>
                    <span>נתוני עומס יופיעו כאן לאחר שיוך נציגים.</span>
                </div>
            ) : (
                <div className="dashboard-v4g-workload-list">
                    {visibleRows.map((row) => {
                        const total = Math.max(0, Number(row.total || 0));
                        const urgent = Math.min(
                            total,
                            Math.max(0, Number(row.urgent || 0))
                        );
                        const width = total > 0
                            ? Math.max(8, Math.round((total / maxTotal) * 100))
                            : 0;
                        const initial = String(row.name || 'מ')
                            .trim()
                            .charAt(0) || 'מ';

                        return (
                            <article
                                key={row.name}
                                className="dashboard-v4g-workload-row"
                            >
                                <span
                                    className="dashboard-v4g-avatar"
                                    aria-hidden="true"
                                >
                                    {initial}
                                </span>

                                <div className="dashboard-v4g-workload-row__main">
                                    <div className="dashboard-v4g-workload-row__head">
                                        <strong
                                            className="dashboard-v4g-workload-row__name"
                                            title={row.name}
                                        >
                                            {row.name}
                                        </strong>

                                        <span
                                            className={`dashboard-v4g-status ${
                                                urgent > 0
                                                    ? 'dashboard-v4g-status--warning'
                                                    : 'dashboard-v4g-status--success'
                                            }`}
                                        >
                                            {urgent > 0 ? 'עמוס' : 'תקין'}
                                        </span>
                                    </div>

                                    <div className="dashboard-v4g-workload-row__meta">
                                        <span>{total} פניות</span>
                                        <span>{urgent} דחופות</span>
                                    </div>

                                    <div className="dashboard-v4g-progress">
                                        <span
                                            className="dashboard-v4g-progress__fill"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </DashboardCard>
    );
};

export default WorkloadPanel;
