import React, { useMemo } from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';
import { DashboardCard, DashboardSelectPill } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';
import UrgencyDonutChart from './UrgencyDonutChart.jsx';

const priorityColor = (item) => {
    const label = String(item?.rawLabel || item?.label || '').replace(/-\d+$/, '');
    if (label.includes('גבוה')) return 'var(--color-danger)';
    if (label.includes('בינונ')) return 'var(--color-warning)';
    if (label.includes('נמוכ')) return 'var(--color-primary)';
    return item?.color || 'var(--color-info)';
};

const CategoryCard = ({ category, selected, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(category.id)}
        className="tamar-claude-category"
        data-selected={selected ? 'true' : 'false'}
        style={{ '--category-color': category.color || 'var(--color-primary)' }}
    >
        <span className="tamar-claude-category__head">
            <span className="tamar-claude-category__dot" />
            <strong>{category.shortLabel}</strong>
        </span>
        <span className="tamar-claude-category__pct">
            {category.formattedPercentage}% מהפניות
        </span>
        <span className="tamar-claude-category__value">{category.value}</span>
        <span className="tamar-claude-category__track">
            <span
                style={{ width: `${Math.max(6, Number(category.percentage || 0))}%` }}
            />
        </span>
    </button>
);

const UrgencyBreakdownCard = ({
    expandedSection,
    priorityData = [],
    visibleDonutCategoryCards = [],
    donutCategories = [],
    hiddenDonutCategoryCount = 0,
    totalDonutInquiries,
    selectedDonutCategory,
    visibleSelectedDonutInquiries = [],
    donutCategoryPage,
    setDonutCategoryPage,
    totalDonutCategoryPages,
    donutInquiryPage,
    setDonutInquiryPage,
    totalDonutInquiryPages,
    selectDonutCategory,
    filters,
    setFilters,
    categoryOptions = [],
    handleDonutClick,
    handleUrgentInspect,
    formatDonutInquiryAge,
    toggleExpandedSection
}) => {
    const expanded = expandedSection === 'donut';

    const data = useMemo(
        () => priorityData.map((item) => ({
            ...item,
            color: priorityColor(item)
        })),
        [priorityData]
    );

    const total = data.reduce(
        (sum, item) => sum + Number(item?.value || 0),
        0
    );

    const legend = data
        .filter((item) => Number(item?.value || 0) > 0)
        .slice(0, 3)
        .map((item) => ({
            ...item,
            percentage: total > 0
                ? Math.round((Number(item.value || 0) / total) * 100)
                : 0
        }));

    const renderLegend = () => (
        <div className="tamar-claude-urgency-legend">
            {legend.map((item) => (
                <button
                    key={item.label}
                    type="button"
                    onClick={() => handleDonutClick?.(item)}
                    className="tamar-claude-urgency-legend__row"
                >
                    <span
                        className="tamar-claude-urgency-legend__dot"
                        style={{ background: item.color }}
                    />
                    <span>{String(item.label).replace(/-\d+$/, '')}</span>
                    <span>{item.percentage}%</span>
                    <strong>{item.value}</strong>
                </button>
            ))}
        </div>
    );

    if (!expanded) {
        return (
            <DashboardCard className="tamar-claude-dashboard-card" dir="rtl">
                <div className="tamar-claude-card-header">
                    <div className="tamar-claude-card-header__main">
                        <span className="tamar-claude-icon-chip">
                            <Icon name="pie" className="h-[15px] w-[15px]" />
                        </span>
                        <div>
                            <h2 className="tamar-claude-card-title">
                                התפלגות פניות
                            </h2>
                            <p className="tamar-claude-card-subtitle">
                                פילוח לפי רמת דחיפות
                            </p>
                        </div>
                    </div>

                    <SectionExpandButton
                        expanded={false}
                        onClick={() => toggleExpandedSection('donut')}
                        title="הרחב"
                    />
                </div>

                <div className="tamar-claude-urgency-body">
                    {renderLegend()}
                    <UrgencyDonutChart
                        data={data}
                        onSegmentClick={handleDonutClick}
                        totalOverride={totalDonutInquiries}
                    />
                </div>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard className="tamar-claude-dashboard-card tamar-claude-dashboard-card--expanded" dir="rtl">
            <div className="tamar-claude-card-header">
                <div className="tamar-claude-card-header__main">
                    <span className="tamar-claude-icon-chip">
                        <Icon name="pie" className="h-[15px] w-[15px]" />
                    </span>
                    <div>
                        <h2 className="tamar-claude-card-title">
                            התפלגות פניות
                        </h2>
                        <p className="tamar-claude-card-subtitle">
                            פילוח לפי רמת דחיפות וקטגוריה
                        </p>
                    </div>
                </div>

                <SectionExpandButton
                    expanded
                    onClick={() => toggleExpandedSection('donut')}
                    title="מזער"
                />
            </div>

            <div className="tamar-claude-urgency-expanded">
                <section className="tamar-claude-urgency-summary">
                    <UrgencyDonutChart
                        data={data}
                        onSegmentClick={handleDonutClick}
                        isExpanded
                        totalOverride={totalDonutInquiries}
                    />
                    {renderLegend()}
                </section>

                <section className="tamar-claude-category-panel">
                    <div className="tamar-claude-panel-header">
                        <div>
                            <h3>פילוח מדדים מפורט</h3>
                            <p>לחצו על קטגוריה לצפייה בפניות</p>
                        </div>
                        <span>{donutCategories.length} קטגוריות</span>
                    </div>

                    <div className="tamar-claude-urgency-toolbar">
                        <DashboardSelectPill
                            label="קטגוריה"
                            icon="filter"
                            value={filters?.category || 'all'}
                            onChange={(value) => {
                                setFilters?.((current) => ({
                                    ...current,
                                    category: value
                                }));
                                setDonutCategoryPage(0);
                                setDonutInquiryPage(0);
                            }}
                            options={categoryOptions.length
                                ? categoryOptions
                                : [{ value: 'all', label: 'כל הקטגוריות' }]}
                        />
                    </div>

                    <div className="tamar-claude-category-grid">
                        {visibleDonutCategoryCards.map((category) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                selected={selectedDonutCategory?.id === category.id}
                                onSelect={selectDonutCategory}
                            />
                        ))}
                    </div>

                    {totalDonutCategoryPages > 1 && (
                        <div className="tamar-claude-pager">
                            <button
                                type="button"
                                disabled={donutCategoryPage === 0}
                                onClick={() =>
                                    setDonutCategoryPage((page) => Math.max(0, page - 1))
                                }
                            >
                                הקודם
                            </button>
                            <span>
                                עמוד {donutCategoryPage + 1} מתוך {totalDonutCategoryPages}
                            </span>
                            <button
                                type="button"
                                disabled={donutCategoryPage >= totalDonutCategoryPages - 1}
                                onClick={() =>
                                    setDonutCategoryPage((page) =>
                                        Math.min(totalDonutCategoryPages - 1, page + 1)
                                    )
                                }
                            >
                                הבא
                            </button>
                        </div>
                    )}
                </section>
            </div>

            <section className="tamar-claude-drilldown">
                <div className="tamar-claude-panel-header">
                    <h3>
                        פניות בקטגוריה שנבחרה
                        {selectedDonutCategory
                            ? ` · ${selectedDonutCategory.shortLabel}`
                            : ''}
                    </h3>
                </div>

                <div className="tamar-claude-drilldown__head">
                    <span>מזהה</span>
                    <span>נושא</span>
                    <span>דחיפות</span>
                    <span>זמן פתוח</span>
                    <span>נציג מטפל</span>
                    <span>סטטוס</span>
                    <span>פעולה</span>
                </div>

                <div className="tamar-claude-drilldown__body">
                    {visibleSelectedDonutInquiries.map((item) => {
                        const subject = item.subject
                            || item.title
                            || item.description
                            || item.requester
                            || '—';
                        const assignee = item.assigneeLabel
                            || item.assignee
                            || 'לא משויך';
                        const age = formatDonutInquiryAge?.(item.date)
                            || item.durationLabel
                            || '—';

                        return (
                            <div key={item.id} className="tamar-claude-drilldown__row">
                                <strong>{item.id}</strong>
                                <span title={subject}>{subject}</span>
                                <span>{String(item.priority || '—').replace(/-\d+$/, '')}</span>
                                <span>{age}</span>
                                <span title={assignee}>{assignee}</span>
                                <span>{item.status === 'open' ? 'פתוחה' : 'סגורה'}</span>
                                <button
                                    type="button"
                                    onClick={() => handleUrgentInspect(item)}
                                >
                                    צפייה
                                </button>
                            </div>
                        );
                    })}
                </div>

                {totalDonutInquiryPages > 1 && (
                    <div className="tamar-claude-pager">
                        <button
                            type="button"
                            disabled={donutInquiryPage === 0}
                            onClick={() =>
                                setDonutInquiryPage((page) => Math.max(0, page - 1))
                            }
                        >
                            הקודם
                        </button>
                        <span>
                            עמוד {donutInquiryPage + 1} מתוך {totalDonutInquiryPages}
                        </span>
                        <button
                            type="button"
                            disabled={donutInquiryPage >= totalDonutInquiryPages - 1}
                            onClick={() =>
                                setDonutInquiryPage((page) =>
                                    Math.min(totalDonutInquiryPages - 1, page + 1)
                                )
                            }
                        >
                            הבא
                        </button>
                    </div>
                )}
            </section>
        </DashboardCard>
    );
};

export default UrgencyBreakdownCard;
