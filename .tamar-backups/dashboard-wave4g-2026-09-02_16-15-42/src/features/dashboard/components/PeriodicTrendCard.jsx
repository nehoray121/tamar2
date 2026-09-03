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
            className={`dashboard-trend-card-v4a ${isBarExpanded ? 'dashboard-expanded-card-v4a' : ''}`}
            dir="rtl"
        >
            <header className="dashboard-card-header-v4a">
                <div className="dashboard-card-header-v4a__titles">
                    <div className="dashboard-card-header-v4a__row">
                        <span className="dashboard-card-header-v4a__icon">
                            <Icon name="chartBar" className="h-[15px] w-[15px]" />
                        </span>
                        <h2 className="dashboard-card-header-v4a__title">
                            מגמת פניות תקופתית
                        </h2>
                    </div>
                    <p className="dashboard-card-header-v4a__subtitle">
                        מגמת פניות לפי התקופה והסינון הנוכחי
                    </p>
                </div>

                <div className="dashboard-card-header-v4a__actions">
                    {isBarExpanded && (
                        <span className="dashboard-count-chip-v4a">
                            סה״כ <strong>{filteredBarData.length}</strong>
                        </span>
                    )}

                    <SectionExpandButton
                        expanded={isBarExpanded}
                        onClick={() => toggleExpandedSection('barChart')}
                        compact
                        title={
                            isBarExpanded
                                ? 'מזער מגמת פניות תקופתית'
                                : 'הרחב מגמת פניות תקופתית'
                        }
                    />
                </div>
            </header>

            <DashboardFilterToolbar
                isExpanded={isBarExpanded}
                filters={filters}
                setFilters={setFilters}
                categoryOptions={categoryOptions}
                sortOptions={sortOptions}
                onExport={() => exportDashboardCsv(groupedBarData)}
            />

            <div className="dashboard-trend-card-v4a__chart">
                <PeriodicBarChart
                    data={groupedBarData}
                    onBarClick={handleBarClick}
                    barsPerPage={isBarExpanded ? 12 : 6}
                    isExpanded={isBarExpanded}
                    resetKey={`${filters.category}|${filters.grouping}|${filters.dateFrom}|${filters.dateTo}`}
                />
            </div>
        </DashboardCard>
    );
};

export default PeriodicTrendCard;
