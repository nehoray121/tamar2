import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import {
    DashboardDateInput,
    DashboardSegmentedButton,
    DashboardSelectPill
} from './DashboardPrimitives.jsx';

const DashboardFilterToolbar = ({
    isExpanded,
    filters,
    setFilters,
    categoryOptions,
    sortOptions,
    onExport
}) => (
    <div
        className="dashboard-filter-toolbar-v4a"
        data-expanded={isExpanded ? 'true' : 'false'}
    >
        <div className="dashboard-filter-toolbar-v4a__row">
            <span className="dashboard-filter-toolbar-v4a__label">
                <Icon name="filter" className="h-3.5 w-3.5" />
                מסננים
            </span>

            {filters.category === 'period' ? (
                <div className="dashboard-segmented-v4a">
                    <DashboardSegmentedButton
                        label="יומי"
                        isActive={filters.grouping === 'daily'}
                        onClick={() => setFilters((current) => ({
                            ...current,
                            grouping: 'daily'
                        }))}
                    />
                    <DashboardSegmentedButton
                        label="שבועי"
                        isActive={filters.grouping === 'weekly'}
                        onClick={() => setFilters((current) => ({
                            ...current,
                            grouping: 'weekly'
                        }))}
                    />
                    <DashboardSegmentedButton
                        label="חודשי"
                        isActive={filters.grouping === 'monthly'}
                        onClick={() => setFilters((current) => ({
                            ...current,
                            grouping: 'monthly'
                        }))}
                    />
                </div>
            ) : (
                <div className="dashboard-filter-context-v4a">
                    <Icon name="chartBar" className="h-3.5 w-3.5" />
                    <span>מקובץ לפי ערכי השדה</span>
                </div>
            )}

            <DashboardDateInput
                label="מתאריך"
                value={filters.dateFrom}
                onChange={(value) => setFilters((current) => ({
                    ...current,
                    dateFrom: value
                }))}
            />

            <DashboardDateInput
                label="עד"
                value={filters.dateTo}
                onChange={(value) => setFilters((current) => ({
                    ...current,
                    dateTo: value
                }))}
            />

            <DashboardSelectPill
                label="קטגוריה"
                icon="filter"
                value={filters.category}
                onChange={(value) => setFilters((current) => ({
                    ...current,
                    category: value
                }))}
                options={categoryOptions}
            />

            <DashboardSelectPill
                label="מיון"
                icon="arrowDownUp"
                value={filters.sortOrder}
                onChange={(value) => setFilters((current) => ({
                    ...current,
                    sortOrder: value
                }))}
                options={sortOptions}
            />

            <button
                type="button"
                onClick={onExport}
                className="dashboard-export-v4a"
            >
                <Icon name="arrowDownStraight" className="h-3.5 w-3.5" />
                Excel
            </button>
        </div>
    </div>
);

export default DashboardFilterToolbar;
