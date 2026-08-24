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
        <DashboardCard className={`tamar-v22-trend-card dashboard-card-motion flex h-full min-h-0 flex-col ${isBarExpanded ? 'dashboard-expanded-card' : ''}`}>
            <div className={`tamar-v22-card-header shrink-0 ${isBarExpanded ? 'px-5 py-4' : 'px-4 py-3'}`}>
                <div className="flex items-start justify-between gap-3" dir="rtl">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="tamar-v22-card-icon-chip">
                                <Icon name="chartBar" className="h-4 w-4" />
                            </span>
                            <h2 className="tamar-v22-card-title">פניות לפי תקופה</h2>
                        </div>
                        <p className="tamar-v22-card-subtitle">מגמת פניות לפי התקופה והסינון הנוכחי</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {isBarExpanded && (
                            <span className="tamar-v22-count-chip">
                                סה״כ מוצגות: <strong>{filteredBarData.length}</strong>
                            </span>
                        )}
                        <SectionExpandButton
                            expanded={isBarExpanded}
                            onClick={() => toggleExpandedSection('barChart')}
                            title={isBarExpanded ? 'מזער פניות לפי תקופה' : 'הרחב פניות לפי תקופה'}
                        />
                    </div>
                </div>

                <DashboardFilterToolbar
                    isExpanded={isBarExpanded}
                    filters={filters}
                    setFilters={setFilters}
                    categoryOptions={categoryOptions}
                    sortOptions={sortOptions}
                    onExport={() => exportDashboardCsv(groupedBarData)}
                />
            </div>

            <div className={`${isBarExpanded ? 'min-h-[220px]' : 'min-h-[150px]'} flex-1 overflow-hidden`}>
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
