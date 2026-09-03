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
            className={`dashboard-workload-card-v4b ${
                expanded ? 'dashboard-panel-expanded-v4b' : ''
            }`}
            dir="rtl"
        >
            <header className="dashboard-surface-header-v4b">
                <div className="dashboard-surface-header-v4b__titles">
                    <div className="dashboard-surface-header-v4b__row">
                        <span className="dashboard-surface-header-v4b__icon">
                            <Icon name="user" className="h-[15px] w-[15px]" />
                        </span>
                        <h2 className="dashboard-surface-header-v4b__title">
                            עומס עבודה בצוות
                        </h2>
                    </div>
                    <p className="dashboard-surface-header-v4b__subtitle">
                        חלוקת עומס לפי מטפל
                    </p>
                </div>

                <SectionExpandButton
                    expanded={expanded}
                    onClick={onToggle}
                    compact
                    title={
                        expanded
                            ? 'מזער עומס עבודה בצוות'
                            : 'הרחב עומס עבודה בצוות'
                    }
                />
            </header>

            {visibleRows.length === 0 ? (
                <div className="dashboard-empty-v4b">
                    <span className="dashboard-empty-v4b__icon">
                        <Icon name="user" className="h-4 w-4" />
                    </span>
                    <strong>אין נציגים משויכים לחדר</strong>
                    <span>נתוני עומס יופיעו כאן לאחר שיוך נציגים.</span>
                </div>
            ) : (
                <div
                    className={`dashboard-team-grid-v4b ${
                        visibleRows.length === 1
                            ? 'dashboard-team-grid-v4b--single'
                            : ''
                    }`}
                >
                    {visibleRows.map((row) => {
                        const total = Math.max(
                            0,
                            Number(row.total || 0)
                        );
                        const urgent = Math.min(
                            total,
                            Math.max(0, Number(row.urgent || 0))
                        );
                        const regular = Math.max(0, total - urgent);
                        const relativeWidth = total > 0
                            ? Math.max(
                                8,
                                Math.round((total / maxTotal) * 100)
                            )
                            : 0;
                        const urgentPercent = total > 0
                            ? Math.round((urgent / total) * 100)
                            : 0;
                        const regularPercent = 100 - urgentPercent;
                        const initial = String(row.name || 'מ')
                            .trim()
                            .charAt(0) || 'מ';

                        return (
                            <article
                                key={row.name}
                                className="dashboard-team-tile-v4b"
                            >
                                <span
                                    className="dashboard-team-tile-v4b__avatar"
                                    aria-hidden="true"
                                >
                                    {initial}
                                </span>

                                <div className="dashboard-team-tile-v4b__content">
                                    <div className="dashboard-team-tile-v4b__head">
                                        <strong
                                            className="dashboard-team-tile-v4b__name"
                                            title={row.name}
                                        >
                                            {row.name}
                                        </strong>

                                        <span
                                            className={`dashboard-team-status-v4b ${
                                                urgent > 0
                                                    ? 'dashboard-team-status-v4b--attention'
                                                    : 'dashboard-team-status-v4b--ok'
                                            }`}
                                        >
                                            {urgent > 0
                                                ? 'דורש תשומת לב'
                                                : 'תקין'}
                                        </span>
                                    </div>

                                    <div className="dashboard-team-tile-v4b__meta">
                                        <span>{total} פניות</span>
                                        <span>{regular} רגילות</span>
                                        <span>{urgent} דחופות</span>
                                    </div>

                                    <div className="dashboard-team-tile-v4b__track">
                                        <div
                                            className="dashboard-team-tile-v4b__load"
                                            style={{ width: `${relativeWidth}%` }}
                                        >
                                            <span
                                                className="dashboard-team-tile-v4b__regular"
                                                style={{
                                                    width: `${regularPercent}%`
                                                }}
                                            />
                                            <span
                                                className="dashboard-team-tile-v4b__urgent"
                                                style={{
                                                    width: `${urgentPercent}%`
                                                }}
                                            />
                                        </div>
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
