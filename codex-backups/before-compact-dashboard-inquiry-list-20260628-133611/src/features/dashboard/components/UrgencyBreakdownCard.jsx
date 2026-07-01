import React, { useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';
import UrgencyDonutChart from './UrgencyDonutChart.jsx';

const UrgencyBreakdownCard = ({
    expandedSection,
    setExpandedSection,
    priorityData,
    visibleDonutCategories,
    hasHiddenDonutCategories,
    visibleDonutCategoryCards,
    donutCategories,
    selectedDonutCategory,
    visibleSelectedDonutInquiries,
    donutCategoryPage,
    setDonutCategoryPage,
    totalDonutCategoryPages,
    donutInquiryPage,
    setDonutInquiryPage,
    totalDonutInquiryPages,
    selectDonutCategory,
    handleDonutClick,
    handleUrgentInspect,
    formatDonutInquiryAge,
    toggleExpandedSection
}) => {
    const isDonutExpanded = expandedSection === 'donut';
    const [showInlineDetails, setShowInlineDetails] = useState(false);
    const visibleCardCount = visibleDonutCategoryCards.length;
    const collapsedPanelHeight = totalDonutInquiryPages > 1 ? 336 : 292;

    const categoryGridClass = visibleCardCount <= 1 ? 'grid-cols-1' : visibleCardCount === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const categoryRowsClass = visibleCardCount <= 3 ? 'grid-rows-1' : 'grid-rows-2';

    useEffect(() => {
        if (!isDonutExpanded || !selectedDonutCategory) {
            setShowInlineDetails(false);
        }
    }, [isDonutExpanded, selectedDonutCategory]);

    if (!isDonutExpanded) {
        return (
            <DashboardCard className="dashboard-card-motion flex h-full min-h-0 flex-col p-4" dir="rtl">
                <div className="flex shrink-0 items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">פילוח לפי דחיפות</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-400">התפלגות כוללת במערכת</p>
                    </div>

                    <div className="flex items-start gap-3">
                        <SectionExpandButton expanded={false} onClick={() => toggleExpandedSection('donut')} compact title="הרחב פילוח לפי דחיפות" />

                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 ring-1 ring-blue-100">
                            <Icon name="dashboard" className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col py-2">
                    <div className="flex min-h-[230px] flex-1 items-center justify-center">
                        <UrgencyDonutChart data={priorityData} onSegmentClick={handleDonutClick} />
                    </div>

                    <div className="mt-1.5 min-h-[54px] w-full shrink-0 rounded-3xl border border-slate-100 bg-slate-50/80 p-2">
                        <div className="flex items-start justify-center gap-2">
                            {visibleDonutCategories.map(item => (
                                <button key={item.label} type="button" title={item.label} onClick={() => handleDonutClick(item)} className="flex min-w-0 max-w-full items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="max-w-[84px] truncate" dir="rtl">{item.label}</span>
                                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-500">{item.value}</span>
                                </button>
                            ))}

                            {hasHiddenDonutCategories && (
                                    <button
                                        type="button"
                                        title="הצג קטגוריות נוספות"
                                        aria-label="הצג קטגוריות נוספות"
                                        onClick={() => setExpandedSection('donut')}
                                    className="inline-flex h-[38px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-base font-black text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-md"
                                >
                                    ...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard className="dashboard-card-motion dashboard-expanded-card flex h-full min-h-0 flex-col p-4" dir="rtl">
            <div className="flex shrink-0 items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-slate-950">פילוח לפי דחיפות</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-400">התפלגות כוללת במערכת</p>
                </div>

                <div className="flex items-start gap-3">
                    <SectionExpandButton expanded onClick={() => toggleExpandedSection('donut')} compact title="מזער פילוח לפי דחיפות" />

                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 ring-1 ring-blue-100">
                        <Icon name="dashboard" className="h-6 w-6" />
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 pt-3">
                <div className="grid shrink-0 gap-4 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.25fr)]">
                    <section className="flex min-h-[320px] flex-col rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div className="flex min-h-0 flex-1 items-center justify-center">
                            <div className="flex aspect-square w-full max-w-[360px] items-center justify-center">
                                <UrgencyDonutChart data={priorityData} onSegmentClick={handleDonutClick} isExpanded />
                            </div>
                        </div>
                    </section>

                    <section className="flex min-h-[320px] flex-col rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <h3 className="text-xl font-black text-slate-950">פילוח מדדים מפורט</h3>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{donutCategories.length} קטגוריות</span>
                        </div>

                        <div className="flex min-h-0 flex-1 items-center px-4 py-4">
                            {donutCategories.length === 0 ? (
                                <div className="flex h-full w-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">אין קטגוריות להצגה</div>
                            ) : (
                                <div className={`grid h-full w-full auto-rows-fr gap-3 ${categoryGridClass} ${categoryRowsClass}`}>
                                    {visibleDonutCategoryCards.map((category, index) => {
                                        const isSelected = selectedDonutCategory?.id === category.id;

                                        return (
                                            <article
                                                key={category.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => selectDonutCategory(category.id)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        selectDonutCategory(category.id);
                                                    }
                                                }}
                                                className="flex min-h-0 cursor-pointer flex-col rounded-[24px] border border-slate-200 bg-white p-4 text-right shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                                style={isSelected ? { borderColor: category.color, backgroundColor: category.lightColor, boxShadow: `0 12px 24px ${category.borderColor}` } : { transitionDelay: `${index * 40}ms` }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-base font-black text-slate-900">{category.shortLabel}</div>
                                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                                                </div>

                                                <div className="mt-4 flex items-end justify-between gap-3">
                                                    <div className="text-sm font-bold text-slate-400">פניות</div>
                                                    <div className="text-3xl font-black text-slate-950">{category.value}</div>
                                                </div>

                                                <div className="mt-3 text-sm font-semibold text-slate-500">{category.formattedPercentage}% מכלל הפניות</div>

                                                <div className="mt-4 h-2 rounded-full bg-slate-100">
                                                    <div className="h-full rounded-full" style={{ width: `${Math.max(6, category.percentage)}%`, backgroundColor: category.color }} />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        selectDonutCategory(category.id);
                                                    }}
                                                    className="mt-auto pt-4 text-right text-sm font-bold"
                                                    style={{ color: category.color }}
                                                >
                                                    צפה בפניות
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {totalDonutCategoryPages > 1 && (
                            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-3 text-sm font-bold text-slate-500">
                                <button type="button" onClick={() => setDonutCategoryPage(currentPage => Math.max(0, currentPage - 1))} disabled={donutCategoryPage === 0} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הקודם</button>
                                <span>עמוד {donutCategoryPage + 1} מתוך {totalDonutCategoryPages}</span>
                                <button type="button" onClick={() => setDonutCategoryPage(currentPage => Math.min(totalDonutCategoryPages - 1, currentPage + 1))} disabled={donutCategoryPage >= totalDonutCategoryPages - 1} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הבא</button>
                            </div>
                        )}
                    </section>
                </div>

                <section className={`flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-[max-height,box-shadow] duration-300 ease-in-out motion-reduce:transition-none ${showInlineDetails ? 'flex-1' : ''}`} style={{ maxHeight: showInlineDetails ? '100%' : `${collapsedPanelHeight}px` }}>
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-slate-950">פניות בקטגוריה שנבחרה</span>
                            {selectedDonutCategory && <span className="rounded-full px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200" style={{ backgroundColor: selectedDonutCategory.lightColor }}>{selectedDonutCategory.shortLabel} · {selectedDonutCategory.value}</span>}
                        </div>

                        <button type="button" onClick={() => selectedDonutCategory && setShowInlineDetails(current => !current)} disabled={!selectedDonutCategory} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{showInlineDetails ? 'צמצם' : 'לראות עוד'}</button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
                        {visibleSelectedDonutInquiries.length === 0 ? (
                            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">אין פניות בקטגוריה זו</div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30">
                                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.8fr] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black text-slate-400" dir="rtl">
                                    <span>מזהה</span>
                                    <span>דחיפות</span>
                                    <span>זמן פתוח</span>
                                    <span>נציג מטפל</span>
                                    <span>סטטוס</span>
                                    <span>פעולה</span>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                                    {visibleSelectedDonutInquiries.map(item => (
                                        <div key={item.id} className="grid min-h-[58px] grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.8fr] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-600 last:border-b-0" dir="rtl">
                                            <span className="font-black text-slate-900">{item.id}</span>

                                            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 font-bold text-slate-600">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.chartColor }} />
                                                {item.priority.replace(/-\d+$/, '')}
                                            </span>

                                            <span className="font-semibold text-slate-500">{formatDonutInquiryAge(item.date)}</span>
                                            <span className="font-semibold text-slate-600">{item.assignee}</span>
                                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ${item.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{item.status === 'open' ? 'פתוחה' : 'סגורה'}</span>
                                            <button type="button" onClick={() => handleUrgentInspect(item)} className="rounded-2xl bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700 transition hover:bg-blue-100">צפייה</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-3 text-sm font-bold text-slate-500">
                        <button type="button" onClick={() => setDonutInquiryPage(currentPage => Math.max(0, currentPage - 1))} disabled={donutInquiryPage === 0} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הקודם</button>
                        <span>עמוד {donutInquiryPage + 1} מתוך {totalDonutInquiryPages}</span>
                        <button type="button" onClick={() => setDonutInquiryPage(currentPage => Math.min(totalDonutInquiryPages - 1, currentPage + 1))} disabled={donutInquiryPage >= totalDonutInquiryPages - 1} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הבא</button>
                    </div>
                </section>
            </div>
        </DashboardCard>
    );
};

export default UrgencyBreakdownCard;
