import React from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';
import { exportDashboardCsv } from '../utils/dashboard.utils.js';
import { DashboardCard } from './DashboardPrimitives.jsx';
import DashboardFilterToolbar from './DashboardFilterToolbar.jsx';
import PeriodicBarChart from './PeriodicBarChart.jsx';
import SectionExpandButton from './SectionExpandButton.jsx';

const PeriodicTrendCard = ({
    expandedSection,
    filteredBarData,
    groupedBarData,
    filters,
    setFilters,
    categoryOptions,
    sortOptions,
    handleBarClick,
    toggleExpandedSection
}) => {
    const expanded = expandedSection === 'barChart';

    return (
        <DashboardCard
            className={`tamar-claude-dashboard-card ${
                expanded ? 'tamar-claude-dashboard-card--expanded' : ''
            }`}
            dir="rtl"
        >
            <div className="tamar-claude-card-header">
                <div className="tamar-claude-card-header__main">
                    <span className="tamar-claude-icon-chip">
                        <Icon name="chartBar" className="h-[15px] w-[15px]" />
                    </span>

                    <div>
                        <h2 className="tamar-claude-card-title">
                            פניות לפי תקופה
                        </h2>
                        <p className="tamar-claude-card-subtitle">
                            מגמת פניות לפי התקופה והסינון הנוכחי
                        </p>
                    </div>
                </div>

                <div className="tamar-claude-card-header__actions">
                    <span className="tamar-claude-count-chip">
                        {filteredBarData.length} פניות
                    </span>
                    <SectionExpandButton
                        expanded={expanded}
                        onClick={() => toggleExpandedSection('barChart')}
                        title={expanded ? 'מזער' : 'הרחב'}
                    />
                </div>
            </div>

            {expanded && (
                <DashboardFilterToolbar
                    isExpanded
                    filters={filters}
                    setFilters={setFilters}
                    categoryOptions={categoryOptions}
                    sortOptions={sortOptions}
                    onExport={() => exportDashboardCsv(groupedBarData)}
                />
            )}

            <div className="tamar-claude-chart-shell">
                <PeriodicBarChart
                    data={groupedBarData}
                    onBarClick={handleBarClick}
                    barsPerPage={12}
                    isExpanded={expanded}
                    resetKey={`${filters.category}|${filters.grouping}|${filters.dateFrom}|${filters.dateTo}`}
                />
            </div>
        </DashboardCard>
    );
};

export default PeriodicTrendCard;
