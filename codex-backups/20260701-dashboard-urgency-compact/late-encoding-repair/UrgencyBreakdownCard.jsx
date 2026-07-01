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
    const collapsedPanelHeight = totalDonutInquiryPages > 1 ? 278 : 242;

    const categoryGridClass = visibleCardCount <= 1 ? 'grid-cols-1' : visibleCardCount === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const categoryRowsClass = visibleCardCount <= 3 ? 'grid-rows-1' : 'grid-rows-2';

    useEffect(() => {
        if (!isDonutExpanded || !selectedDonutCategory) {
            setShowInlineDetails(false);
        }
    }, [isDonutExpanded, selectedDonutCategory]);

    if (!isDonutExpanded) {
        return (
            <DashboardCard className="dashboard-card-motion flex h-full min-h-0 flex-col p-3" dir="rtl">
                <div className="flex shrink-0 items-start justify-between gap-2">
                    <div>
                        <h2 className="text-[22px] font-black leading-7 text-slate-950">׳₪׳™׳׳•׳— ׳׳₪׳™ ׳“׳—׳™׳₪׳•׳×</h2>
                        <p className="mt-0.5 text-sm font-semibold text-slate-400">׳”׳×׳₪׳׳’׳•׳× ׳›׳•׳׳׳× ׳‘׳׳¢׳¨׳›׳×</p>
                    </div>

                    <div className="flex items-start gap-2">
                        <SectionExpandButton expanded={false} onClick={() => toggleExpandedSection('donut')} compact title="׳”׳¨׳—׳‘ ׳₪׳™׳׳•׳— ׳׳₪׳™ ׳“׳—׳™׳₪׳•׳×" />

                        <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 ring-1 ring-blue-100">
                            <Icon name="dashboard" className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col pt-1">
                    <div className="flex min-h-0 flex-1 items-center justify-center">
                        <UrgencyDonutChart data={priorityData} onSegmentClick={handleDonutClick} />
                    </div>
                </div>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard className="dashboard-card-motion dashboard-expanded-card flex h-full min-h-0 flex-col p-3" dir="rtl">
            <div className="flex shrink-0 items-start justify-between gap-2">
                <div>
                    <h2 className="text-[22px] font-black leading-7 text-slate-950">׳₪׳™׳׳•׳— ׳׳₪׳™ ׳“׳—׳™׳₪׳•׳×</h2>
                    <p className="mt-0.5 text-sm font-semibold text-slate-400">׳”׳×׳₪׳׳’׳•׳× ׳›׳•׳׳׳× ׳‘׳׳¢׳¨׳›׳×</p>
                </div>

                <div className="flex items-start gap-3">
                    <SectionExpandButton expanded onClick={() => toggleExpandedSection('donut')} compact title="׳׳–׳¢׳¨ ׳₪׳™׳׳•׳— ׳׳₪׳™ ׳“׳—׳™׳₪׳•׳×" />

                    <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 ring-1 ring-blue-100">
                        <Icon name="dashboard" className="h-4 w-4" />
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">
                <div className="grid shrink-0 gap-2.5 xl:grid-cols-[minmax(270px,0.78fr)_minmax(0,1.22fr)]">
                    <section className="flex min-h-[174px] flex-col rounded-[24px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                        <div className="flex min-h-0 flex-1 items-center justify-center">
                            <div className="flex aspect-square w-full max-w-[248px] items-center justify-center">
                                <UrgencyDonutChart data={priorityData} onSegmentClick={handleDonutClick} isExpanded />
                            </div>
                        </div>
                    </section>

                    <section className="flex min-h-[174px] flex-col rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3.5 py-2">
                            <h3 className="text-lg font-black text-slate-950">׳₪׳™׳׳•׳— ׳׳“׳“׳™׳ ׳׳₪׳•׳¨׳˜</h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-500">{donutCategories.length} ׳§׳˜׳’׳•׳¨׳™׳•׳×</span>
                        </div>

                        <div className="flex min-h-0 flex-1 items-start px-2.5 py-2.5">
                            {donutCategories.length === 0 ? (
                                <div className="flex h-full w-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">׳׳™׳ ׳§׳˜׳’׳•׳¨׳™׳•׳× ׳׳”׳¦׳’׳”</div>
                            ) : (
                                <div className={`grid w-full gap-2 ${categoryGridClass} ${categoryRowsClass}`}>
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
                                                className="flex min-h-[108px] cursor-pointer flex-col rounded-[18px] border border-slate-200 bg-white p-2.5 text-right shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                                style={isSelected ? { borderColor: category.color, backgroundColor: category.lightColor, boxShadow: `0 12px 24px ${category.borderColor}` } : { transitionDelay: `${index * 40}ms` }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-sm font-black text-slate-900">{category.shortLabel}</div>
                                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                                                </div>

                                                <div className="mt-1.5 flex items-end justify-between gap-2">
                                                    <div className="text-sm font-bold text-slate-400">׳₪׳ ׳™׳•׳×</div>
                                                    <div className="text-[22px] font-black leading-7 text-slate-950">{category.value}</div>
                                                </div>

                                                <div className="mt-1.5 text-xs font-semibold text-slate-500">{category.formattedPercentage}% ׳׳›׳׳ ׳”׳₪׳ ׳™׳•׳×</div>

                                                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                                                    <div className="h-full rounded-full" style={{ width: `${Math.max(6, category.percentage)}%`, backgroundColor: category.color }} />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        selectDonutCategory(category.id);
                                                    }}
                                                    className="mt-auto pt-1.5 text-right text-xs font-bold"
                                                    style={{ color: category.color }}
                                                >
                                                    ׳¦׳₪׳” ׳‘׳₪׳ ׳™׳•׳×
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {totalDonutCategoryPages > 1 && (
                            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
                                <button type="button" onClick={() => setDonutCategoryPage(currentPage => Math.max(0, currentPage - 1))} disabled={donutCategoryPage === 0} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">׳”׳§׳•׳“׳</button>
                                <span>׳¢׳׳•׳“ {donutCategoryPage + 1} ׳׳×׳•׳ {totalDonutCategoryPages}</span>
                                <button type="button" onClick={() => setDonutCategoryPage(currentPage => Math.min(totalDonutCategoryPages - 1, currentPage + 1))} disabled={donutCategoryPage >= totalDonutCategoryPages - 1} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">׳”׳‘׳</button>
                            </div>
                        )}
                    </section>
                </div>

                <section className={`flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-[max-height,box-shadow] duration-300 ease-in-out motion-reduce:transition-none ${showInlineDetails ? 'flex-1' : ''}`} style={{ maxHeight: showInlineDetails ? '100%' : `${collapsedPanelHeight}px` }}>
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-slate-950">׳₪׳ ׳™׳•׳× ׳‘׳§׳˜׳’׳•׳¨׳™׳” ׳©׳ ׳‘׳—׳¨׳”</span>
                            {selectedDonutCategory && <span className="rounded-full px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200" style={{ backgroundColor: selectedDonutCategory.lightColor }}>{selectedDonutCategory.shortLabel} ֲ· {selectedDonutCategory.value}</span>}
                        </div>

                        <button type="button" onClick={() => selectedDonutCategory && setShowInlineDetails(current => !current)} disabled={!selectedDonutCategory} className="rounded-2xl border border-slate-200 px-3.5 py-1.5 text-sm font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{showInlineDetails ? '׳¦׳׳¦׳' : '׳׳¨׳׳•׳× ׳¢׳•׳“'}</button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
                        {visibleSelectedDonutInquiries.length === 0 ? (
                            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">׳׳™׳ ׳₪׳ ׳™׳•׳× ׳‘׳§׳˜׳’׳•׳¨׳™׳” ׳–׳•</div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/30">
                                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.8fr] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-400" dir="rtl">
                                    <span>׳׳–׳”׳”</span>
                                    <span>׳“׳—׳™׳₪׳•׳×</span>
                                    <span>׳–׳׳ ׳₪׳×׳•׳—</span>
                                    <span>׳ ׳¦׳™׳’ ׳׳˜׳₪׳</span>
                                    <span>׳¡׳˜׳˜׳•׳¡</span>
                                    <span>׳₪׳¢׳•׳׳”</span>
                                </div>

                                <div className="min-h-0 flex-1 overflow-hidden bg-white">
                                    {visibleSelectedDonutInquiries.map(item => (
                                        <div key={item.id} className="grid min-h-[52px] grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.8fr] items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm text-slate-600 last:border-b-0" dir="rtl">
                                            <span className="font-black text-slate-900">{item.id}</span>

                                            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 font-bold text-slate-600">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.chartColor }} />
                                                {item.priority.replace(/-\d+$/, '')}
                                            </span>

                                            <span className="font-semibold text-slate-500">{formatDonutInquiryAge(item.date)}</span>
                                            <span className="font-semibold text-slate-600">{item.assignee}</span>
                                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ${item.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{item.status === 'open' ? '׳₪׳×׳•׳—׳”' : '׳¡׳’׳•׳¨׳”'}</span>
                                            <button type="button" onClick={() => handleUrgentInspect(item)} className="rounded-2xl bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700 transition hover:bg-blue-100">׳¦׳₪׳™׳™׳”</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {totalDonutInquiryPages > 1 && (

                    <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
                        <button type="button" onClick={() => setDonutInquiryPage(currentPage => Math.max(0, currentPage - 1))} disabled={donutInquiryPage === 0} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">׳”׳§׳•׳“׳</button>
                        <span>׳¢׳׳•׳“ {donutInquiryPage + 1} ׳׳×׳•׳ {totalDonutInquiryPages}</span>
                        <button type="button" onClick={() => setDonutInquiryPage(currentPage => Math.min(totalDonutInquiryPages - 1, currentPage + 1))} disabled={donutInquiryPage >= totalDonutInquiryPages - 1} className="rounded-2xl border border-slate-200 px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">׳”׳‘׳</button>
                    </div>

                    )}

                    </section>
            </div>
        </DashboardCard>
    );
};

export default UrgencyBreakdownCard;



