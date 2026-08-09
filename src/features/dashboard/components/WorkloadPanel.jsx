import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const WorkloadPanel = ({ rows, expanded, onToggle }) => {
    const visibleRows = expanded ? rows : rows.slice(0, 3);
    const maxTotal = Math.max(...rows.map(row => row.total), 1);

    return (
        <DashboardCard className={`dashboard-card-motion flex h-full min-h-0 flex-col p-3 ${expanded ? 'dashboard-expanded-card' : ''}`} dir="rtl">
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
                <SectionExpandButton expanded={expanded} onClick={onToggle} compact title={expanded ? 'מזער עומס מטפלים' : 'הרחב עומס מטפלים'} />
                <div className="flex origin-right scale-[0.92] items-center gap-2">
                    <Icon name="user" className="h-4 w-4 text-blue-500" />
                    <h2 className="text-2xl font-black inquiry-primary-text">עומס מטפלים</h2>
                </div>
            </div>

            {/* <div className={`min-h-0 flex-1 ${expanded ? 'overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' : 'overflow-hidden'}`}>
                <div className={`${expanded ? 'dashboard-legend-reveal' : ''} space-y-2.5 pr-1`}>
                    {visibleRows.map(row => {
                        const totalWidth = Math.max(20, Math.round((row.total / maxTotal) * 100));
                        const urgentWidth = Math.min(totalWidth, Math.max(0, Math.round((row.urgent / Math.max(row.total, 1)) * totalWidth)));

                        return (
                            <div key={row.name}>
                                <div className="mb-1 flex items-end justify-between gap-3">
                                    <span className="text-xs font-bold inquiry-secondary-text">{row.name}</span>
                                    <span className="text-xs font-black inquiry-primary-text">{row.total}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div className="flex h-full rounded-full" style={{ width: `${totalWidth}%` }}>
                                        <div className="h-full bg-blue-500" style={{ width: `${Math.max(0, totalWidth - urgentWidth)}%` }} />
                                        <div className="h-full bg-red-400" style={{ width: `${urgentWidth}%` }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div> */}
            <div
    className={`min-h-0 flex-1 ${
        expanded
            ? 'overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
            : 'overflow-hidden'
    }`}
>
    <div className={`${expanded ? 'dashboard-legend-reveal' : ''} space-y-2.5 pr-1`}>
        {!visibleRows.length && (
            <div className="flex min-h-[84px] items-center justify-center text-center text-xs font-bold inquiry-muted-text">אין נתוני עומס להצגה</div>
        )}
        {visibleRows.map(row => {
            // רוחב כל החלק הצבוע ביחס לערך הגבוה ביותר
            const totalWidth = Math.max(
                20,
                Math.round((row.total / Math.max(maxTotal, 1)) * 100)
            );

            // החלוקה הפנימית בתוך החלק הצבוע
            const urgentPercent = Math.min(
                100,
                Math.max(
                    0,
                    Math.round(
                        (row.urgent / Math.max(row.total, 1)) * 100
                    )
                )
            );

            const regularPercent = 100 - urgentPercent;

            return (
                <div key={row.name}>
                    {/* שם מימין, מספר משמאל */}
                    <div className="mb-1 flex flex-row-reverse items-end justify-between gap-3">
                        <span className="text-right text-xs font-bold inquiry-secondary-text">
                            {row.name}
                        </span>

                        <span className="text-left text-xs font-black inquiry-primary-text">
                            {row.total}
                        </span>
                    </div>

                    {/* הפס כולו מתחיל מצד ימין */}
                    <div className="flex h-1.5 justify-end overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                            className="flex h-full flex-row-reverse overflow-hidden rounded-full"
                            style={{ width: `${totalWidth}%` }}
                        >
                            {/* כחול בצד ימין */}
                            <div
                                className="h-full bg-blue-500"
                                style={{ width: `${regularPercent}%` }}
                            />

                            {/* אדום אחרי הכחול */}
                            <div
                                className="h-full bg-red-400"
                                style={{ width: `${urgentPercent}%` }}
                            />
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
