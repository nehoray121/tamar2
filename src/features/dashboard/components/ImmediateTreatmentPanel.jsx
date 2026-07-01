import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

        const ImmediateTreatmentPanel = ({ items, expanded, onToggle, onInspect }) => {
            const visibleItems = expanded ? items : items.slice(0, 2);

            return (
                <DashboardCard className={`dashboard-card-motion flex h-full min-h-0 flex-col ${expanded ? 'dashboard-expanded-card' : ''}`} dir="rtl">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                        <div className="flex origin-right scale-[0.92] items-center gap-2 text-red-500">
                            <Icon name="target" className="h-4 w-4" />
                            <h2 className="text-2xl font-black text-red-500">דורש טיפול עכשיו</h2>
                        </div>
                        <SectionExpandButton expanded={expanded} onClick={onToggle} compact title={expanded ? 'מזער דורש טיפול עכשיו' : 'הרחב דורש טיפול עכשיו'} />
                    </div>

                    <div className={`min-h-0 flex-1 px-3 py-1.5 ${expanded ? 'overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' : 'overflow-hidden'}`}>
                        <div className={`${expanded ? 'dashboard-legend-reveal' : ''} space-y-1.5`}>
                            {visibleItems.map((item, index) => (
                                <div key={item.id} className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-transparent px-2.5 py-1.5 transition hover:border-slate-100 hover:bg-slate-50">
                                    <div className="w-[80px] shrink-0 text-right text-xs font-black text-slate-800">{item.id}</div>
                                    <div className="w-[76px] shrink-0">
                                        <span className={`inline-flex rounded-xl px-2.5 py-1 text-[11px] font-black ${item.priorityColor}`}>
                                            {item.priority.replace(/-\d+$/, '')}
                                        </span>
                                    </div>
                                    <div className="flex w-[76px] shrink-0 items-center gap-1 text-xs font-bold text-slate-500">
                                        <Icon name="clock" className="h-3.5 w-3.5 text-red-400" />
                                        {item.durationLabel}
                                    </div>
                                    <div className={`min-w-0 flex-1 text-sm font-bold ${item.assigneeLabel === 'ללא שיוך' ? 'text-amber-500' : 'text-slate-600'}`}>
                                        {item.assigneeLabel}
                                    </div>
                                    <div className="shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onInspect(item)}
                                            className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                                                index === 0
                                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                        >
                                            {index === 0 ? 'טפל' : 'צפייה'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DashboardCard>
            );
        };

export default ImmediateTreatmentPanel;


