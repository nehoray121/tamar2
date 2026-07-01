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
        <DashboardCard className={`dashboard-card-motion flex h-full min-h-0 flex-col ${isBarExpanded ? 'dashboard-expanded-card' : ''}`}>
            <div className={`shrink-0 border-b border-slate-100 bg-white/90 ${isBarExpanded ? 'px-5 py-4' : 'px-4 py-2'}`}>
                <div className={`flex flex-wrap justify-between ${isBarExpanded ? 'items-center gap-3' : 'items-start gap-3'}`} dir="rtl">
                    <div>
                        <h2 className="flex items-center gap-2 text-[22px] font-black leading-7 text-slate-950">
                            <Icon name="chartBar" className="h-6 w-6 text-blue-600" /> מגמת פניות תקופתית
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-400">גרף עמודות עם 12 עמודות בתצוגה, סינון, מיון וייצוא.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isBarExpanded && <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">סה״כ מוצגות: <span className="text-lg">{filteredBarData.length}</span></div>}
                        <SectionExpandButton
                            expanded={isBarExpanded}
                            onClick={() => toggleExpandedSection('barChart')}
                            title={isBarExpanded ? 'מזער מגמת פניות תקופתית' : 'הרחב מגמת פניות תקופתית'}
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
            <div className={`${isBarExpanded ? 'min-h-[220px]' : 'min-h-[168px]'} flex-1 overflow-hidden`}>
                <PeriodicBarChart data={groupedBarData} onBarClick={handleBarClick} barsPerPage={isBarExpanded ? 12 : 6} isExpanded={isBarExpanded} />
            </div>
        </DashboardCard>
    );
};

export default PeriodicTrendCard;


