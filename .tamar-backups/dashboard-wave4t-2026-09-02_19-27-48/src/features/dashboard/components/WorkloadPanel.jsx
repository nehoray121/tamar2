import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const WorkloadPanel = ({ rows = [], expanded, onToggle }) => {
    const visible = expanded ? rows : rows.slice(0, 4);
    const maxTotal = Math.max(...rows.map((row) => Number(row.total || 0)), 1);

    return (
        <DashboardCard
            className={`tamar-claude-dashboard-card ${
                expanded ? 'tamar-claude-dashboard-card--bottom-expanded' : ''
            }`}
            dir="rtl"
        >
            <div className="tamar-claude-card-header">
                <div className="tamar-claude-card-header__main">
                    <span className="tamar-claude-icon-chip">
                        <Icon name="user" className="h-[15px] w-[15px]" />
                    </span>
                    <div>
                        <h2 className="tamar-claude-card-title">עומס נציגים</h2>
                        <p className="tamar-claude-card-subtitle">
                            לפי נציג בחדר
                        </p>
                    </div>
                </div>

                <SectionExpandButton
                    expanded={expanded}
                    onClick={onToggle}
                    title={expanded ? 'מזער' : 'הרחב'}
                />
            </div>

            <div
                className={`tamar-claude-workload-list ${
                    expanded ? 'tamar-claude-workload-list--expanded' : ''
                }`}
            >
                {visible.length === 0 ? (
                    <div className="tamar-claude-empty">
                        אין נציגים משויכים לחדר
                    </div>
                ) : (
                    visible.map((row) => {
                        const total = Number(row.total || 0);
                        const urgent = Number(row.urgent || 0);
                        const width = total > 0
                            ? Math.max(8, Math.round((total / maxTotal) * 100))
                            : 0;
                        const initial = String(row.name || 'מ').trim().charAt(0) || 'מ';

                        return (
                            <article
                                key={row.name}
                                className="tamar-claude-workload-row"
                            >
                                <span className="tamar-claude-avatar">{initial}</span>

                                <div className="tamar-claude-workload-row__body">
                                    <div className="tamar-claude-workload-row__head">
                                        <strong title={row.name}>{row.name}</strong>
                                        <span
                                            className={`tamar-claude-status ${
                                                urgent > 0
                                                    ? 'tamar-claude-status--warning'
                                                    : 'tamar-claude-status--success'
                                            }`}
                                        >
                                            {urgent > 0 ? 'עמוס' : 'תקין'}
                                        </span>
                                    </div>

                                    <div className="tamar-claude-workload-row__meta">
                                        <span>{total} פניות</span>
                                        <span>{urgent} דחופות</span>
                                    </div>

                                    <div className="tamar-claude-progress">
                                        <span style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </DashboardCard>
    );
};

export default WorkloadPanel;
