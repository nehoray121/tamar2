import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
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
    const isBarExpanded = expandedSection === 'barChart';

    return (
        <DashboardCard
            className={`dashboard-v4g-trend ${
                isBarExpanded ? 'dashboard-v4g-trend--expanded' : ''
            }`}
            dir="rtl"
        >
            <header className="dashboard-v4g-card-header">
                <div className="dashboard-v4g-card-header__main">
                    <span className="dashboard-v4g-icon-chip">
                        <Icon name="chartBar" className="h-[15px] w-[15px]" />
                    </span>

                    <div className="dashboard-v4g-card-header__titles">
                        <h2 className="dashboard-v4g-card-header__title">
                            פניות לפי תקופה
                        </h2>
                        <p className="dashboard-v4g-card-header__subtitle">
                            מגמת פניות לפי התקופה והסינון הנוכחי
                        </p>
                    </div>
                </div>

                <div className="dashboard-v4g-card-header__actions">
                    <span className="dashboard-v4g-count-chip">
                        <strong>{filteredBarData.length}</strong>
                        <span>פניות</span>
                    </span>

                    <SectionExpandButton
                        expanded={isBarExpanded}
                        onClick={() => toggleExpandedSection('barChart')}
                        compact
                        title={
                            isBarExpanded
                                ? 'מזער פניות לפי תקופה'
                                : 'הרחב פניות לפי תקופה'
                        }
                    />
                </div>
            </header>

            {isBarExpanded && (
                <DashboardFilterToolbar
                    isExpanded
                    filters={filters}
                    setFilters={setFilters}
                    categoryOptions={categoryOptions}
                    sortOptions={sortOptions}
                    onExport={() => exportDashboardCsv(groupedBarData)}
                />
            )}

            <div className="dashboard-v4g-trend__chart">
                <PeriodicBarChart
                    data={groupedBarData}
                    onBarClick={handleBarClick}
                    barsPerPage={12}
                    isExpanded={isBarExpanded}
                    resetKey={`${filters.category}|${filters.grouping}|${filters.dateFrom}|${filters.dateTo}`}
                />
            </div>
        </DashboardCard>
    );
};

export default PeriodicTrendCard;
