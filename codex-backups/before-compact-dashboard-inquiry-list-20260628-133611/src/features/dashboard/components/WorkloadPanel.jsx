import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

        const WorkloadPanel = ({ rows, expanded, onToggle }) => {
            const visibleRows = expanded ? rows : rows.slice(0, 3);
            const maxTotal = Math.max(...rows.map(row => row.total), 1);

            return (
                <DashboardCard className={`dashboard-card-motion flex h-full min-h-0 flex-col p-5 ${expanded ? 'dashboard-expanded-card' : ''}`} dir="rtl">
                    <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Icon name="user" className="h-5 w-5 text-blue-500" />
                            <h2 className="text-2xl font-black text-slate-950">עומס מטפלים</h2>
                        </div>
                        <SectionExpandButton expanded={expanded} onClick={onToggle} compact title={expanded ? 'מזער עומס מטפלים' : 'הרחב עומס מטפלים'} />
                    </div>

                    <div className={`min-h-0 flex-1 ${expanded ? 'overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' : 'overflow-hidden'}`}>
                        <div className={`${expanded ? 'dashboard-legend-reveal' : ''} space-y-4 pr-1`}>
                            {visibleRows.map(row => {
                                const totalWidth = Math.max(20, Math.round((row.total / maxTotal) * 100));
                                const urgentWidth = Math.min(totalWidth, Math.max(0, Math.round((row.urgent / Math.max(row.total, 1)) * totalWidth)));

                                return (
                                    <div key={row.name}>
                                        <div className="mb-1 flex items-end justify-between gap-3">
                                            <span className="text-sm font-bold text-slate-700">{row.name}</span>
                                            <span className="text-sm font-black text-slate-900">{row.total}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div className="flex h-full rounded-full" style={{ width: `${totalWidth}%` }}>
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.max(0, totalWidth - urgentWidth)}%` }} />
                                                <div className="h-full bg-red-400" style={{ width: `${urgentWidth}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DashboardCard>
            );
        };

export default WorkloadPanel;
