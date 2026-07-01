import { useMemo, useState } from 'react';
import { filterDashboardInquiries, groupDashboardInquiries, sortDashboardGroups } from '../utils/dashboard.utils.js';

const defaultFilters = {
    dateFrom: '',
    dateTo: '',
    grouping: 'monthly',
    category: 'all',
    sortOrder: 'desc'
};

const sortOptions = [
    { value: 'desc', label: 'מהגבוה לנמוך' },
    { value: 'asc', label: 'מהנמוך לגבוה' }
];

export function useDashboardFilters(inquiries) {
    const [filters, setFilters] = useState(defaultFilters);

    const filteredBarData = useMemo(
        () => filterDashboardInquiries(inquiries, filters),
        [inquiries, filters.category, filters.dateFrom, filters.dateTo]
    );

    const groupedBarData = useMemo(
        () => sortDashboardGroups(groupDashboardInquiries(filteredBarData, filters.grouping), filters.sortOrder),
        [filteredBarData, filters.grouping, filters.sortOrder]
    );

    const categoryOptions = useMemo(() => {
        const categories = Array.from(new Set(inquiries.map((item) => item.assignee)));
        return [
            { value: 'all', label: 'כל הקטגוריות' },
            ...categories.map((category) => ({ value: category, label: category }))
        ];
    }, [inquiries]);

    return {
        filters,
        setFilters,
        filteredBarData,
        groupedBarData,
        categoryOptions,
        sortOptions,
        hasActiveFilters: Boolean(filters.dateFrom || filters.dateTo || filters.category !== 'all')
    };
}
