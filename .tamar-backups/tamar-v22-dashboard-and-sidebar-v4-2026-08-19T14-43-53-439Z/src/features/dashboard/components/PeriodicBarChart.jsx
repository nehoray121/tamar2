import React, { useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';

const PeriodicBarChart = ({ data, onBarClick, barsPerPage = 6, isExpanded = false, resetKey = '' }) => {
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(data.length / barsPerPage));
    const maxVal = Math.max(...data.map(item => item.total), 0);
    const yAxisMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
    const yAxisSteps = [1, 0.75, 0.5, 0.25, 0];
    const visibleBars = data.slice(page * barsPerPage, page * barsPerPage + barsPerPage);
    const paddedBars = [...visibleBars];
    while (paddedBars.length < barsPerPage) paddedBars.push(null);

    useEffect(() => {
        setPage(currentPage => Math.min(currentPage, pageCount - 1));
    }, [pageCount, barsPerPage, data.length]);
            // tamar-dashboard-bar-page-reset:v1
            useEffect(() => {
                setPage(0);
            }, [resetKey]);


    if (data.length === 0) {
        return (
            <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-b-[24px] bg-[var(--color-surface-raised)] text-sm font-bold text-[var(--color-text-muted)]">
                אין נתונים להצגה
            </div>
        );
    }

    const chartPaddingClass = isExpanded ? 'px-4 pb-3 pt-4 sm:px-5' : 'px-4 pb-1.5 pt-2.5';
    const plotPaddingClass = isExpanded ? 'px-4 pt-5 sm:px-6 lg:px-8' : 'px-5 pt-3';
    const plotMinHeightClass = 'min-h-0';
    const labelSlotClass = isExpanded ? 'min-h-[48px]' : 'min-h-[34px]';
    const labelGapClass = isExpanded ? 'pt-3' : 'pt-1';
    const navSpacingClass = isExpanded ? 'mt-3' : 'mt-2';

    return (
        <div className={`tamar-v22-bar-chart dashboard-chart-surface relative flex h-full min-h-0 ${chartPaddingClass} flex-col overflow-hidden rounded-b-[24px] bg-[var(--color-surface-raised)]`}>
            <div className="pointer-events-none absolute inset-x-4 inset-y-4 rounded-[24px]  bg-transparent" />

            <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${plotPaddingClass}`}>
                <div dir="ltr" className="grid min-h-0 flex-1 grid-cols-[0px_minmax(0,1fr)] gap-3">
                    <div className="flex min-h-0 flex-col">
                        <div className={`relative ${plotMinHeightClass} min-h-0 flex-1`}>
                            {yAxisSteps.map((step, index) => (
                                <span
                                    key={step}
                                    className="pointer-events-none absolute right-0 text-[10px] font-bold text-slate-400"
                                    dir="ltr"
                                    style={{
                                        top: `${(1 - step) * 100}%`,
                                        transform: index === 0 ? 'translateY(0)' : index === yAxisSteps.length - 1 ? 'translateY(-100%)' : 'translateY(-50%)'
                                    }}
                                >
                                    {Math.round(yAxisMax * step)}
                                </span>
                            ))}
                        </div>
                        <div className={`shrink-0 ${labelGapClass}`}>
                            <div className={labelSlotClass} />
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className={`relative ${plotMinHeightClass} min-h-0 flex-1`}>
                            {yAxisSteps.map(step => (
                                <div
                                    key={step}
                                    className="dashboard-chart-grid-line pointer-events-none absolute left-0 right-0 border-t border-[var(--color-border)]"
                                    style={{ top: `${(1 - step) * 100}%` }}
                                />
                            ))}

                            <div className="dashboard-bar-columns relative z-10 flex h-full items-end justify-between gap-2">
                                {paddedBars.map((item, index) => {
                                    if (!item) {
                                        return <div key={`empty-${index}`} className="flex min-w-0 flex-1" />;
                                    }

                                    const normalizedValue = Math.max(0, Math.min(item.total, yAxisMax));
                                    const heightPct = (normalizedValue / yAxisMax) * 100;
                                    const isHot = index === 0 && isExpanded;
                                    return (
                                        <button
                                            key={`${item.label}-${index}`}
                                            type="button"
                                            title={`${item.label} - ${item.total} פניות`}
                                            onClick={() => onBarClick(item)}
                                            className="group relative h-full min-w-0 flex-1 outline-none"
                                        >
                                            <div
                                                className="pointer-events-none absolute left-0 right-0 z-20 flex w-full justify-center"
                                                style={{ bottom: `calc(${heightPct}% + 8px)` }}
                                            >
                                                <span className="dashboard-bar-tooltip rounded-full bg-[var(--color-surface-raised)] px-2 py-1 text-xs font-black text-[var(--color-text-primary)] shadow-sm ring-1 ring-[var(--color-border)]">{item.total}</span>
                                            </div>
                                            <div className="flex min-h-0 h-full items-end justify-center">
                                                <span
                                                    className={`dashboard-v22-bar w-full ${isExpanded ? 'max-w-[52px]' : 'max-w-[42px]'} rounded-full transition-all duration-300 group-hover:brightness-95 group-hover:drop-shadow-xl ${isHot ? 'bg-gradient-to-b from-[var(--color-primary-hover)] via-[var(--color-primary)] to-[var(--color-primary-soft)]' : 'bg-gradient-to-b from-[var(--color-primary)] via-blue-400 to-[var(--color-primary-soft)]'
                                                        }`}
                                                    style={{ height: `${heightPct}%` }}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`flex shrink-0 items-start justify-between gap-2 ${labelGapClass}`}>
                            {paddedBars.map((item, index) => (
                                <div key={item ? `${item.label}-label-${index}` : `empty-label-${index}`} className="flex min-w-0 flex-1 justify-center">
                                    {item ? (
                                        <span
                                            title={item.label}
                                            dir="rtl"
                                            className={`dashboard-bar-label flex ${labelSlotClass} w-full ${isExpanded ? 'max-w-[112px] text-[11px]' : 'max-w-[96px] text-[10px]'} items-start justify-center px-1 text-center font-bold leading-4 text-[var(--color-text-secondary)]`}
                                        >
                                            {item.label}
                                        </span>
                                    ) : (
                                        <div className={labelSlotClass} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {pageCount > 1 && (
                <div className={`relative z-20 ${navSpacingClass} flex shrink-0 items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 shadow-sm`}>
                    <button
                        type="button"
                        onClick={() => setPage(currentPage => Math.max(0, currentPage - 1))}
                        disabled={page === 0}
                        className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Icon name="arrowRight" className="w-4 h-4" />
                                {barsPerPage} הקודמות
                            </button>
                    <div className="text-xs font-black text-[var(--color-text-secondary)]">
                        מציג {Math.min(data.length, page * barsPerPage + 1)}-{Math.min(data.length, (page + 1) * barsPerPage)} מתוך {data.length} · {barsPerPage} עמודות בכל מעבר
                    </div>
                    <button
                        type="button"
                        onClick={() => setPage(currentPage => Math.min(pageCount - 1, currentPage + 1))}
                        disabled={page >= pageCount - 1}
                        className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                                {barsPerPage} הבאות <Icon name="arrowLeft" className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default PeriodicBarChart;



