import React, { useMemo } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { DashboardCard } from './DashboardPrimitives.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';
import UrgencyDonutChart from './UrgencyDonutChart.jsx';

const getPriorityColor = (item) => {
    const label = String(
        item?.rawLabel || item?.label || ''
    ).replace(/-\d+$/, '');

    if (label.includes('גבוה')) return 'var(--color-danger)';
    if (label.includes('בינונ')) return 'var(--color-warning)';
    if (label.includes('נמוכ')) return 'var(--color-primary)';

    return item?.color || 'var(--color-info)';
};

const getPriorityTone = (value) => {
    const label = String(value || '').replace(/-\d+$/, '');

    if (label.includes('גבוה')) return 'danger';
    if (label.includes('בינונ')) return 'warning';
    if (label.includes('נמוכ')) return 'primary';

    return 'info';
};

const CategoryCard = ({ category, isSelected, onSelect }) => {
    const percentage = Number(
        category?.formattedPercentage
        ?? category?.percentage
        ?? 0
    );

    const activate = () => onSelect(category.id);

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={activate}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            }}
            className={`dashboard-category-card-v4b ${
                isSelected ? 'dashboard-category-card-v4b--selected' : ''
            }`}
            style={{
                '--cat-color': category.color || 'var(--color-primary)'
            }}
        >
            <div className="dashboard-category-card-v4b__head">
                <span className="dashboard-category-card-v4b__name">
                    {category.shortLabel}
                </span>
                <span className="dashboard-category-card-v4b__dot" />
            </div>

            <div className="dashboard-category-card-v4b__metric">
                <span className="dashboard-category-card-v4b__pct">
                    {Number.isFinite(percentage) ? percentage : 0}% מהפניות
                </span>
                <strong className="dashboard-category-card-v4b__value">
                    {category.value}
                </strong>
            </div>

            <span className="dashboard-category-card-v4b__track">
                <span
                    className="dashboard-category-card-v4b__fill"
                    style={{
                        width: `${Math.max(
                            6,
                            Number(category.percentage || percentage || 0)
                        )}%`
                    }}
                />
            </span>

            <span className="dashboard-category-card-v4b__link">
                צפה בפניות
            </span>
        </article>
    );
};

const PriorityBadge = ({ item }) => {
    const tone = getPriorityTone(item?.priority);

    return (
        <span
            className={`dashboard-priority-badge-v4b dashboard-priority-badge-v4b--${tone}`}
        >
            <span className="dashboard-priority-badge-v4b__dot" />
            {String(item?.priority || '—').replace(/-\d+$/, '')}
        </span>
    );
};

const UrgencyBreakdownCard = ({
    expandedSection,
    priorityData = [],
    visibleDonutCategoryCards = [],
    donutCategories = [],
    hasHiddenDonutCategories,
    hiddenDonutCategoryCount = 0,
    hiddenDonutInquiryCount = 0,
    totalDonutCategoryCount,
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
    handleDonutClick,
    handleUrgentInspect,
    formatDonutInquiryAge,
    toggleExpandedSection
}) => {
    const isExpanded = expandedSection === 'donut';

    const displayPriorityData = useMemo(
        () => priorityData.map((item) => ({
            ...item,
            color: getPriorityColor(item)
        })),
        [priorityData]
    );

    const priorityTotal = displayPriorityData.reduce(
        (sum, item) => sum + Number(item?.value || 0),
        0
    );

    const legendItems = displayPriorityData
        .filter((item) => Number(item?.value || 0) > 0)
        .slice(0, 6);

    const categoryTotal = totalDonutCategoryCount ?? donutCategories.length;
    const categorySummary = hasHiddenDonutCategories
        || hiddenDonutCategoryCount > 0
        ? `מוצגות ${donutCategories.length} מתוך ${categoryTotal} קטגוריות`
        : `${donutCategories.length} קטגוריות`;

    const hiddenCategorySummary = hiddenDonutCategoryCount > 0
        ? `ועוד ${hiddenDonutCategoryCount} קטגוריות · ${hiddenDonutInquiryCount} פניות`
        : '';

    const renderLegend = (limit) => {
        const visible = legendItems.slice(0, limit);

        if (visible.length === 0) {
            return (
                <div className="dashboard-empty-v4b dashboard-empty-v4b--dense">
                    <strong>אין נתוני דחיפות להצגה</strong>
                </div>
            );
        }

        return visible.map((item, index) => {
            const percentage = priorityTotal > 0
                ? Math.round(
                    (Number(item.value || 0) / priorityTotal) * 100
                )
                : 0;

            return (
                <button
                    key={`${item.label}-${index}`}
                    type="button"
                    className="dashboard-donut-legend-v4b__row"
                    onClick={() => handleDonutClick?.(item)}
                >
                    <span
                        className="dashboard-donut-legend-v4b__dot"
                        style={{
                            backgroundColor:
                                item.color || 'var(--color-primary)'
                        }}
                    />
                    <span className="dashboard-donut-legend-v4b__label">
                        {String(item.label || '').replace(/-\d+$/, '')}
                    </span>
                    <span className="dashboard-donut-legend-v4b__pct">
                        {percentage}%
                    </span>
                    <strong className="dashboard-donut-legend-v4b__value">
                        {item.value}
                    </strong>
                </button>
            );
        });
    };

    if (!isExpanded) {
        return (
            <DashboardCard
                className="dashboard-donut-card-v4b"
                dir="rtl"
            >
                <header className="dashboard-surface-header-v4b">
                    <div className="dashboard-surface-header-v4b__titles">
                        <div className="dashboard-surface-header-v4b__row">
                            <span className="dashboard-surface-header-v4b__icon">
                                <Icon
                                    name="dashboard"
                                    className="h-[15px] w-[15px]"
                                />
                            </span>
                            <h2 className="dashboard-surface-header-v4b__title">
                                התפלגות פניות
                            </h2>
                        </div>
                        <p className="dashboard-surface-header-v4b__subtitle">
                            פילוח לפי רמת דחיפות
                        </p>
                    </div>

                    <SectionExpandButton
                        expanded={false}
                        onClick={() => toggleExpandedSection('donut')}
                        compact
                        title="הרחב התפלגות פניות"
                    />
                </header>

                <div className="dashboard-donut-layout-v4b">
                    <div className="dashboard-donut-legend-v4b">
                        {renderLegend(4)}
                    </div>

                    <div className="dashboard-donut-visual-v4b">
                        <UrgencyDonutChart
                            data={displayPriorityData}
                            onSegmentClick={handleDonutClick}
                            totalOverride={totalDonutInquiries}
                        />
                    </div>
                </div>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard
            className="dashboard-donut-card-v4b dashboard-donut-card-v4b--expanded"
            dir="rtl"
        >
            <header className="dashboard-surface-header-v4b">
                <div className="dashboard-surface-header-v4b__titles">
                    <div className="dashboard-surface-header-v4b__row">
                        <span className="dashboard-surface-header-v4b__icon">
                            <Icon
                                name="dashboard"
                                className="h-[15px] w-[15px]"
                            />
                        </span>
                        <h2 className="dashboard-surface-header-v4b__title">
                            פילוח לפי דחיפות
                        </h2>
                        <span className="dashboard-count-chip-v4b">
                            <strong>
                                {totalDonutInquiries ?? priorityTotal}
                            </strong>
                            <span>פניות</span>
                        </span>
                    </div>
                    <p className="dashboard-surface-header-v4b__subtitle">
                        התפלגות כוללת במערכת
                    </p>
                </div>

                <SectionExpandButton
                    expanded
                    onClick={() => toggleExpandedSection('donut')}
                    compact
                    title="מזער פילוח לפי דחיפות"
                />
            </header>

            <div className="dashboard-donut-expanded-shell-v4b">
                <div className="dashboard-donut-expanded-top-v4b">
                    <section className="dashboard-panel-v4b dashboard-panel-v4b--inset dashboard-donut-summary-v4b">
                        <div className="dashboard-donut-summary-v4b__visual">
                            <UrgencyDonutChart
                                data={displayPriorityData}
                                onSegmentClick={handleDonutClick}
                                isExpanded
                                totalOverride={totalDonutInquiries}
                            />
                        </div>

                        <div className="dashboard-donut-summary-v4b__legend">
                            {renderLegend(3)}
                        </div>
                    </section>

                    <section className="dashboard-panel-v4b dashboard-metrics-panel-v4b">
                        <div className="dashboard-panel-header-v4b">
                            <div>
                                <h3 className="dashboard-panel-header-v4b__title">
                                    פילוח מדדים מפורט
                                </h3>
                                {hiddenCategorySummary && (
                                    <p className="dashboard-panel-header-v4b__meta">
                                        {hiddenCategorySummary}
                                    </p>
                                )}
                            </div>

                            <span className="dashboard-count-chip-v4b dashboard-count-chip-v4b--neutral">
                                {categorySummary}
                            </span>
                        </div>

                        <div className="dashboard-category-grid-v4b">
                            {visibleDonutCategoryCards.length === 0 ? (
                                <div className="dashboard-empty-v4b dashboard-empty-v4b--dense">
                                    <strong>אין קטגוריות להצגה</strong>
                                </div>
                            ) : (
                                visibleDonutCategoryCards.map((category) => (
                                    <CategoryCard
                                        key={category.id}
                                        category={category}
                                        isSelected={
                                            selectedDonutCategory?.id
                                            === category.id
                                        }
                                        onSelect={selectDonutCategory}
                                    />
                                ))
                            )}
                        </div>

                        {totalDonutCategoryPages > 1 && (
                            <div className="dashboard-pager-v4b">
                                <button
                                    type="button"
                                    className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                    onClick={() =>
                                        setDonutCategoryPage(
                                            (currentPage) =>
                                                Math.max(
                                                    0,
                                                    currentPage - 1
                                                )
                                        )
                                    }
                                    disabled={donutCategoryPage === 0}
                                >
                                    הקודם
                                </button>

                                <span>
                                    עמוד <strong>{donutCategoryPage + 1}</strong>
                                    {' '}מתוך{' '}
                                    <strong>{totalDonutCategoryPages}</strong>
                                </span>

                                <button
                                    type="button"
                                    className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                    onClick={() =>
                                        setDonutCategoryPage(
                                            (currentPage) =>
                                                Math.min(
                                                    totalDonutCategoryPages - 1,
                                                    currentPage + 1
                                                )
                                        )
                                    }
                                    disabled={
                                        donutCategoryPage
                                        >= totalDonutCategoryPages - 1
                                    }
                                >
                                    הבא
                                </button>
                            </div>
                        )}
                    </section>
                </div>

                <section className="dashboard-panel-v4b dashboard-drilldown-v4b">
                    <div className="dashboard-panel-header-v4b">
                        <div className="dashboard-panel-header-v4b__row">
                            <h3 className="dashboard-panel-header-v4b__title">
                                פניות בקטגוריה שנבחרה
                            </h3>

                            {selectedDonutCategory && (
                                <span
                                    className="dashboard-selected-category-v4b"
                                    style={{
                                        '--cat-color':
                                            selectedDonutCategory.color
                                            || 'var(--color-primary)'
                                    }}
                                >
                                    {selectedDonutCategory.shortLabel}
                                    {' · '}
                                    {selectedDonutCategory.value}
                                </span>
                            )}
                        </div>
                    </div>

                    {visibleSelectedDonutInquiries.length === 0 ? (
                        <div className="dashboard-empty-v4b dashboard-empty-v4b--table">
                            <strong>אין פניות בקטגוריה זו</strong>
                            <span>
                                בחרו קטגוריה אחרת בפילוח כדי לראות את
                                הפניות המתאימות.
                            </span>
                        </div>
                    ) : (
                        <div
                            className="dashboard-drill-table-v4b"
                            role="table"
                        >
                            <div
                                className="dashboard-drill-table-v4b__head"
                                role="row"
                            >
                                <span>מזהה</span>
                                <span>נושא</span>
                                <span>דחיפות</span>
                                <span>זמן פתוח</span>
                                <span>נציג מטפל</span>
                                <span>סטטוס</span>
                                <span>פעולה</span>
                            </div>

                            <div className="dashboard-drill-table-v4b__body">
                                {visibleSelectedDonutInquiries.map((item) => {
                                    const subject = item.subject
                                        || item.title
                                        || item.description
                                        || item.requester
                                        || '—';
                                    const assignee = item.assigneeLabel
                                        || item.assignee
                                        || 'לא משויך';
                                    const age = formatDonutInquiryAge?.(
                                        item.date
                                    ) || item.durationLabel || '—';

                                    return (
                                        <div
                                            key={item.id}
                                            className="dashboard-drill-table-v4b__row"
                                            role="row"
                                        >
                                            <span
                                                className="dashboard-drill-table-v4b__id"
                                                title={item.id}
                                            >
                                                {item.id}
                                            </span>

                                            <span
                                                className="dashboard-drill-table-v4b__subject"
                                                title={subject}
                                            >
                                                {subject}
                                            </span>

                                            <span>
                                                <PriorityBadge item={item} />
                                            </span>

                                            <span className="dashboard-drill-table-v4b__meta">
                                                {age}
                                            </span>

                                            <span
                                                className="dashboard-drill-table-v4b__meta"
                                                title={assignee}
                                            >
                                                {assignee}
                                            </span>

                                            <span>
                                                <span
                                                    className={`dashboard-status-badge-v4b ${
                                                        item.status === 'open'
                                                            ? 'dashboard-status-badge-v4b--open'
                                                            : ''
                                                    }`}
                                                >
                                                    {item.status === 'open'
                                                        ? 'פתוחה'
                                                        : 'סגורה'}
                                                </span>
                                            </span>

                                            <span>
                                                <button
                                                    type="button"
                                                    className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                                    onClick={() =>
                                                        handleUrgentInspect(
                                                            item
                                                        )
                                                    }
                                                >
                                                    צפייה
                                                </button>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {totalDonutInquiryPages > 1 && (
                        <div className="dashboard-pager-v4b">
                            <button
                                type="button"
                                className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                onClick={() =>
                                    setDonutInquiryPage(
                                        (currentPage) =>
                                            Math.max(
                                                0,
                                                currentPage - 1
                                            )
                                    )
                                }
                                disabled={donutInquiryPage === 0}
                            >
                                הקודם
                            </button>

                            <span>
                                עמוד <strong>{donutInquiryPage + 1}</strong>
                                {' '}מתוך{' '}
                                <strong>{totalDonutInquiryPages}</strong>
                            </span>

                            <button
                                type="button"
                                className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
                                onClick={() =>
                                    setDonutInquiryPage(
                                        (currentPage) =>
                                            Math.min(
                                                totalDonutInquiryPages - 1,
                                                currentPage + 1
                                            )
                                    )
                                }
                                disabled={
                                    donutInquiryPage
                                    >= totalDonutInquiryPages - 1
                                }
                            >
                                הבא
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </DashboardCard>
    );
};

export default UrgencyBreakdownCard;
