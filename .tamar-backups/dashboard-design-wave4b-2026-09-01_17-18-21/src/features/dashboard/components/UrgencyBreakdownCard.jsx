import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';
import UrgencyDonutChart from './UrgencyDonutChart.jsx';


const EMPTY_PRIORITY_LEGEND = Object.freeze([
    { label: 'גבוהה-1', rawLabel: 'גבוהה-1', value: 0, color: '#F94144' },
    { label: 'בינונית-2', rawLabel: 'בינונית-2', value: 0, color: '#F59E0B' },
    { label: 'נמוכה-3', rawLabel: 'נמוכה-3', value: 0, color: '#EC4899' }
]);

const UrgencyBreakdownCard = ({
    expandedSection,
    priorityData,
    visibleDonutCategoryCards,
    donutCategories,
    hasHiddenDonutCategories,
    hiddenDonutCategoryCount = 0,
    hiddenDonutInquiryCount = 0,
    totalDonutCategoryCount,
    totalDonutInquiries,
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
    const collapsedPanelHeight = totalDonutInquiryPages > 1 ? 292 : 252;
    const inlineDetailsHeight = showInlineDetails ? '650px' : `${collapsedPanelHeight}px`;
    const inquiryListHeight = showInlineDetails ? '390px' : '170px';

    const categoryGridClass = visibleCardCount <= 1 ? 'grid-cols-1' : visibleCardCount === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const categoryTotal = totalDonutCategoryCount ?? donutCategories.length;
    const categorySummary = hiddenDonutCategoryCount > 0 ? `מוצגות ${donutCategories.length} מתוך ${categoryTotal} קטגוריות` : `${donutCategories.length} קטגוריות`;
    const hiddenCategorySummary = hiddenDonutCategoryCount > 0 ? `ועוד ${hiddenDonutCategoryCount} קטגוריות לא מוצגות · ${hiddenDonutInquiryCount} פניות` : '';
    const categoryRowsClass = visibleCardCount <= 3 ? 'grid-rows-1' : 'grid-rows-2';
    const previewInquiries = useMemo(
        () => (showInlineDetails ? visibleSelectedDonutInquiries : visibleSelectedDonutInquiries.slice(0, 3)),
        [showInlineDetails, visibleSelectedDonutInquiries]
    );

    useEffect(() => {
        if (!isDonutExpanded || !selectedDonutCategory) {
            setShowInlineDetails(false);
        }
    }, [isDonutExpanded, selectedDonutCategory]);

    if (!isDonutExpanded) {
        const collapsedTotal = totalDonutInquiries ?? priorityData.reduce((sum, item) => sum + item.value, 0);
        const legendSource = priorityData.length > 0 ? priorityData : EMPTY_PRIORITY_LEGEND;
        const legendItems = legendSource
            .slice(0, 4)
            .map((item) => ({
                ...item,
                shortLabel: item.label.replace(/-\d+$/, ''),
                percentage: collapsedTotal > 0 ? Math.round((item.value / collapsedTotal) * 100) : 0
            }));

        return (
            <DashboardCard className="tamar-v22-donut-card dashboard-card-motion flex h-full min-h-0 flex-col" dir="rtl">
                <div className="tamar-v22-card-header flex shrink-0 items-start justify-between gap-3 px-4 py-3">
                    <div>
                        <h2 className="tamar-v22-card-title">התפלגות פניות</h2>
                        <p className="tamar-v22-card-subtitle">פילוח לפי רמת דחיפות</p>
                    </div>
                    <SectionExpandButton
                        expanded={false}
                        onClick={() => toggleExpandedSection('donut')}
                        title="הרחב התפלגות פניות"
                    />
                </div>

                <div className="tamar-v22-donut-layout min-h-0 flex-1">
                    <div className="tamar-v22-donut-legend">
                        {!legendItems.length && (
                            <div className="tamar-v22-empty-state">אין נתונים להצגה</div>
                        )}
                        {legendItems.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                disabled={item.value === 0}
                                onClick={() => item.value > 0 && handleDonutClick(item)}
                                className="tamar-v22-donut-legend-row text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:cursor-default"
                            >
                                <span className="tamar-v22-donut-dot" style={{ backgroundColor: item.color }} />
                                <span className="min-w-0 flex-1 truncate">{item.shortLabel}</span>
                                <span className="tamar-v22-donut-percent">{item.percentage}%</span>
                                <strong>{item.value}</strong>
                            </button>
                        ))}
                    </div>

                    <div className="tamar-v22-donut-visual">
                        <UrgencyDonutChart
                            data={priorityData}
                            onSegmentClick={handleDonutClick}
                            totalOverride={totalDonutInquiries}
                            showLabels={false}
                            showHalo={false}
                        />
                    </div>
                </div>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard className="tamar-v22-donut-card tamar-v22-donut-card--expanded dashboard-card-motion dashboard-expanded-card flex h-full min-h-0 w-full flex-col p-3" dir="rtl">
            <div className="flex shrink-0 items-start justify-between gap-2">
                <div>
                    <h2 className="text-[22px] font-black leading-7 text-[var(--color-text-primary)]">פילוח לפי דחיפות</h2>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-muted)]">התפלגות כוללת במערכת</p>
                </div>

                <div className="flex items-start gap-3">
                    <SectionExpandButton expanded onClick={() => toggleExpandedSection('donut')} compact title="מזער פילוח לפי דחיפות" />
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-2.5 text-[var(--color-primary)]">
                        <Icon name="dashboard" className="h-4 w-4" />
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">
                {showInlineDetails ? (
                    <section className="flex shrink-0 min-h-[166px] flex-col rounded-[24px] inquiry-panel">
                        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3.5 py-2">
                            <h3 className="text-lg font-black inquiry-primary-text">פילוח מדדים מפורט</h3>
                            <span className="rounded-full inquiry-soft-panel px-2.5 py-0.5 text-xs font-black inquiry-muted-text">{categorySummary}</span>
                        </div>

                        <div className="flex min-h-0 flex-1 items-start px-2.5 py-2.5">
                            {donutCategories.length === 0 ? (
                                <div className="flex h-full w-full items-center justify-center rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] text-sm font-bold text-[var(--color-text-muted)]">אין קטגוריות להצגה</div>
                            ) : (
                                <div className="grid w-full gap-2 md:grid-cols-3">
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
                                                className="flex min-h-[104px] cursor-pointer flex-col rounded-[18px] inquiry-panel p-2.5 text-right transition duration-300 hover:-translate-y-0.5"
                                                style={isSelected ? { borderColor: category.color, backgroundColor: category.lightColor, boxShadow: `0 12px 24px ${category.borderColor}` } : { transitionDelay: `${index * 40}ms` }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-sm font-black inquiry-primary-text">{category.shortLabel}</div>
                                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                                                </div>

                                                <div className="mt-1.5 flex items-end justify-between gap-2">
                                                    <div className="text-sm font-bold inquiry-muted-text">פניות</div>
                                                    <div className="text-[22px] font-black leading-7 inquiry-primary-text">{category.value}</div>
                                                </div>

                                                <div className="mt-1.5 text-xs font-semibold inquiry-secondary-text">{category.formattedPercentage}% מכלל הפניות</div>

                                                <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-surface-muted)]">
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
                                                    צפה בפניות
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <div className="tamar-v22-donut-expanded-overview grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
                        <section className="flex min-h-[174px] flex-col rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 shadow-sm">
                            <div className="flex min-h-0 flex-1 items-center justify-center">
                                <div className="flex aspect-square w-full max-w-[248px] items-center justify-center">
                                    <UrgencyDonutChart data={priorityData} onSegmentClick={handleDonutClick} isExpanded totalOverride={totalDonutInquiries} />
                                </div>
                            </div>
                        </section>

                        <section className="flex min-h-[174px] flex-col rounded-[24px] inquiry-panel">
                            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3.5 py-2">
                                <h3 className="text-lg font-black inquiry-primary-text">פילוח מדדים מפורט</h3>
                                <span className="rounded-full inquiry-soft-panel px-2.5 py-0.5 text-xs font-black inquiry-muted-text">{categorySummary}</span>
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col px-2.5 py-2.5">
                                {hiddenCategorySummary && <div className="mb-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-[11px] font-black text-[var(--color-text-secondary)]">{hiddenCategorySummary}</div>}
                                {donutCategories.length === 0 ? (
                                    <div className="flex h-full w-full items-center justify-center rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] text-sm font-bold text-[var(--color-text-muted)]">אין קטגוריות להצגה</div>
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
                                                    className="flex min-h-[108px] cursor-pointer flex-col rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5 text-right shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                                    style={isSelected ? { borderColor: category.color, backgroundColor: category.lightColor, boxShadow: `0 12px 24px ${category.borderColor}` } : { transitionDelay: `${index * 40}ms` }}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-sm font-black inquiry-primary-text">{category.shortLabel}</div>
                                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                                                    </div>

                                                    <div className="mt-1.5 flex items-end justify-between gap-2">
                                                        <div className="text-sm font-bold inquiry-muted-text">פניות</div>
                                                        <div className="text-[22px] font-black leading-7 inquiry-primary-text">{category.value}</div>
                                                    </div>

                                                    <div className="mt-1.5 text-xs font-semibold inquiry-secondary-text">{category.formattedPercentage}% מכלל הפניות</div>

                                                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-surface-muted)]">
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
                                                        צפה בפניות
                                                    </button>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {totalDonutCategoryPages > 1 && (
                                <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)]">
                                    <button type="button" onClick={() => setDonutCategoryPage((currentPage) => Math.max(0, currentPage - 1))} disabled={donutCategoryPage === 0} className="inquiry-control rounded-2xl px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הקודם</button>
                                    <span>עמוד {donutCategoryPage + 1} מתוך {totalDonutCategoryPages}</span>
                                    <button type="button" onClick={() => setDonutCategoryPage((currentPage) => Math.min(totalDonutCategoryPages - 1, currentPage + 1))} disabled={donutCategoryPage >= totalDonutCategoryPages - 1} className="inquiry-control rounded-2xl px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הבא</button>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                <section
                    className="dashboard-inline-details-panel flex min-h-0 flex-col overflow-hidden rounded-[24px] inquiry-panel"
                    style={{ maxHeight: inlineDetailsHeight, opacity: showInlineDetails ? 1 : 0.98 }}
                >
                    <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black inquiry-primary-text">פניות בקטגוריה שנבחרה</span>
                            {selectedDonutCategory && (
                                <span className="rounded-full px-3 py-1 text-xs font-black inquiry-primary-text ring-1 ring-[var(--color-border)]" style={{ backgroundColor: selectedDonutCategory.lightColor }}>
                                    {selectedDonutCategory.shortLabel} · {selectedDonutCategory.value}
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            aria-expanded={showInlineDetails}
                            onClick={() => selectedDonutCategory && setShowInlineDetails((current) => !current)}
                            disabled={!selectedDonutCategory}
                            className="rounded-2xl inquiry-control px-3.5 py-1.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {showInlineDetails ? 'צמצם' : 'לראות עוד'}
                        </button>
                    </div>

                    <div className="dashboard-inline-details-body flex min-h-0 flex-1 flex-col px-3 py-2" data-expanded={showInlineDetails ? 'true' : 'false'}>
                        {previewInquiries.length === 0 ? (
                            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[var(--color-border)] bg-transparent text-sm font-bold inquiry-muted-text">אין פניות בקטגוריה זו</div>
                        ) : (
                            <div className="dashboard-inquiry-list-reveal flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-transparent" data-expanded={showInlineDetails ? 'true' : 'false'} style={{ maxHeight: inquiryListHeight, opacity: showInlineDetails ? 1 : 0.96, transform: showInlineDetails ? 'translateY(0)' : 'translateY(-4px)' }}>
                                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.8fr] gap-3 border-b border-[var(--color-border)] inquiry-soft-panel px-3 py-2.5 text-xs font-black inquiry-muted-text" dir="rtl">
                                    <span>מזהה</span>
                                    <span>דחיפות</span>
                                    <span>זמן פתוח</span>
                                    <span>נציג מטפל</span>
                                    <span>סטטוס</span>
                                    <span>פעולה</span>
                                </div>

                                <div className={`min-h-0 flex-1 bg-transparent ${showInlineDetails ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                                    {previewInquiries.map((item) => (
                                        <div key={item.id} className="grid min-h-[56px] grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr_0.8fr] items-center gap-3 border-b border-[var(--color-border)] px-3 py-2.5 text-sm inquiry-secondary-text last:border-b-0" dir="rtl">
                                            <span className="font-black inquiry-primary-text">{item.id}</span>

                                            <span className="dashboard-accent-badge inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 font-bold" style={{ '--dashboard-badge-accent': item.chartColor || 'var(--color-primary)' }}>
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.chartColor }} />
                                                {item.priority.replace(/-\d+$/, '')}
                                            </span>

                                            <span className="font-semibold text-[var(--color-text-secondary)]">{formatDonutInquiryAge(item.date)}</span>
                                            <span className="font-semibold text-[var(--color-text-secondary)]">{item.assignee}</span>
                                            <span className={`dashboard-status-badge inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ${item.status === 'open' ? 'dashboard-status-badge--open' : 'dashboard-status-badge--closed'}`}>
                                                {item.status === 'open' ? 'פתוחה' : 'סגורה'}
                                            </span>
                                            <button type="button" onClick={() => handleUrgentInspect(item)} className="inquiry-control rounded-2xl px-3 py-1.5 text-sm font-black text-[var(--color-primary)] transition">צפייה</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {totalDonutInquiryPages > 1 && (
                        <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)]">
                            <button type="button" onClick={() => setDonutInquiryPage((currentPage) => Math.max(0, currentPage - 1))} disabled={donutInquiryPage === 0} className="inquiry-control rounded-2xl px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הקודם</button>
                            <span>עמוד {donutInquiryPage + 1} מתוך {totalDonutInquiryPages}</span>
                            <button type="button" onClick={() => setDonutInquiryPage((currentPage) => Math.min(totalDonutInquiryPages - 1, currentPage + 1))} disabled={donutInquiryPage >= totalDonutInquiryPages - 1} className="inquiry-control rounded-2xl px-4 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40">הבא</button>
                        </div>
                    )}
                </section>
            </div>
        </DashboardCard>
    );
};

export default UrgencyBreakdownCard;
