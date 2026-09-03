import React from 'react';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const WorkloadPanel = ({ rows, expanded, onToggle }) => {
    const visibleRows = expanded ? rows : rows.slice(0, 4);
    const maxTotal = Math.max(...rows.map((row) => row.total), 1);
    const isSingleRow = visibleRows.length === 1;

    return (
        <DashboardCard className={`tamar-v22-workload-card dashboard-card-motion flex h-full min-h-0 flex-col ${expanded ? 'dashboard-expanded-card' : ''}`} dir="rtl">
            <div className="tamar-v22-card-header flex shrink-0 items-start justify-between gap-3 px-4 py-3">
                <div>
                    <h2 className="tamar-v22-card-title">עומס עבודה בצוות</h2>
                    <p className="tamar-v22-card-subtitle">חלוקת עומס לפי מטפל</p>
                </div>
                <SectionExpandButton
                    expanded={expanded}
                    onClick={onToggle}
                    title={expanded ? 'מזער עומס עבודה בצוות' : 'הרחב עומס עבודה בצוות'}
                />
            </div>

            <div
                data-count={visibleRows.length}
                className={`tamar-v22-team-grid min-h-0 ${isSingleRow ? 'tamar-v22-team-grid--single shrink-0' : 'flex-1'} ${expanded ? 'overflow-y-auto' : 'overflow-hidden'}`}
            >
                {!visibleRows.length && (
                    <div className="tamar-v22-empty-state col-span-full">אין נתוני עומס להצגה</div>
                )}

                {visibleRows.map((row) => {
                    const totalWidth = row.total > 0
                        ? Math.max(8, Math.round((row.total / maxTotal) * 100))
                        : 0;
                    const urgentPercent = row.total > 0
                        ? Math.min(100, Math.max(0, Math.round((row.urgent / row.total) * 100)))
                        : 0;
                    const regularPercent = 100 - urgentPercent;
                    const initial = String(row.name || 'מ').trim().charAt(0) || 'מ';

                    return (
                        <article key={row.name} className="tamar-workload-person-v4 tamar-v22-team-tile">
                            <div className="tamar-v22-team-avatar">{initial}</div>
                            <div className="min-w-0 flex-1">
                                <div className="tamar-v22-team-name truncate">{row.name}</div>
                                <div className="tamar-v22-team-meta">
                                    <span>{row.total} פניות</span>
                                    {row.urgent > 0 && <span className="text-[var(--color-danger)]">{row.urgent} דחופות</span>}
                                </div>
                                <div className="tamar-v22-team-track">
                                    <div className="tamar-v22-team-bar" style={{ width: `${totalWidth}%` }}>
                                        <span className="bg-[var(--color-primary)]" style={{ width: `${regularPercent}%` }} />
                                        <span className="bg-[var(--color-danger)]" style={{ width: `${urgentPercent}%` }} />
                                    </div>
                                </div>
                            </div>
                            <span className={`tamar-v22-team-status ${row.urgent > 0 ? 'tamar-v22-team-status--urgent' : 'tamar-v22-team-status--ok'}`}>
                                {row.urgent > 0 ? 'דורש תשומת לב' : 'תקין'}
                            </span>
                        </article>
                    );
                })}
            </div>
        </DashboardCard>
    );
};

export default WorkloadPanel;
