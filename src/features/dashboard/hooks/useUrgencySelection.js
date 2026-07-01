import { useEffect, useMemo, useState } from 'react';
import { DONUT_CATEGORIES_PER_PAGE, DONUT_INQUIRIES_PER_PAGE } from '../constants/dashboard.constants.js';
import { dashboardPriorities } from '../data/dashboard.mock.js';

export function useUrgencySelection({ donutSource, expandedSection, now }) {
    const [selectedDonutCategoryId, setSelectedDonutCategoryId] = useState(null);
    const [donutCategoryPage, setDonutCategoryPage] = useState(0);
    const [donutInquiryPage, setDonutInquiryPage] = useState(0);

    const priorityData = useMemo(() => {
        return dashboardPriorities.map((priority) => ({
            label: priority.label,
            value: donutSource.filter((item) => item.priority === priority.label).length,
            color: priority.chartColor,
            rawLabel: priority.label
        }));
    }, [donutSource]);

    const donutCategories = useMemo(() => {
        const total = priorityData.reduce((sum, item) => sum + item.value, 0);

        return priorityData
            .filter((item) => item.value > 0)
            .map((item) => {
                const inquiriesByCategory = donutSource
                    .filter((inquiry) => inquiry.priority === item.rawLabel)
                    .sort((a, b) => a.priorityLevel - b.priorityLevel || b.date.localeCompare(a.date));
                const percentage = total > 0 ? (item.value / total) * 100 : 0;

                return {
                    ...item,
                    id: item.rawLabel,
                    shortLabel: item.label.replace(/-\d+$/, ''),
                    inquiries: inquiriesByCategory,
                    percentage,
                    formattedPercentage: Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1),
                    lightColor: `${item.color}12`,
                    borderColor: `${item.color}40`
                };
            });
    }, [priorityData, donutSource]);

    const visibleDonutCategories = expandedSection === 'donut' ? priorityData : priorityData.slice(0, 4);
    const hasHiddenDonutCategories = expandedSection !== 'donut' && priorityData.length > 4;
    const totalDonutCategoryPages = Math.max(1, Math.ceil(donutCategories.length / DONUT_CATEGORIES_PER_PAGE));
    const selectedDonutCategory = donutCategories.find((category) => category.id === selectedDonutCategoryId) ?? donutCategories[0] ?? null;
    const selectedDonutInquiries = selectedDonutCategory?.inquiries ?? [];
    const totalDonutInquiryPages = Math.max(1, Math.ceil(selectedDonutInquiries.length / DONUT_INQUIRIES_PER_PAGE));
    const visibleDonutCategoryCards = donutCategories.slice(
        donutCategoryPage * DONUT_CATEGORIES_PER_PAGE,
        (donutCategoryPage + 1) * DONUT_CATEGORIES_PER_PAGE
    );
    const visibleSelectedDonutInquiries = selectedDonutInquiries.slice(
        donutInquiryPage * DONUT_INQUIRIES_PER_PAGE,
        (donutInquiryPage + 1) * DONUT_INQUIRIES_PER_PAGE
    );

    useEffect(() => {
        setDonutCategoryPage((currentPage) => Math.min(currentPage, totalDonutCategoryPages - 1));
    }, [totalDonutCategoryPages]);

    useEffect(() => {
        setDonutInquiryPage((currentPage) => Math.min(currentPage, totalDonutInquiryPages - 1));
    }, [totalDonutInquiryPages]);

    useEffect(() => {
        if (donutCategories.length === 0) {
            setSelectedDonutCategoryId(null);
            return;
        }

        if (!selectedDonutCategoryId || !donutCategories.some((category) => category.id === selectedDonutCategoryId)) {
            setSelectedDonutCategoryId(donutCategories[0].id);
        }
    }, [donutCategories, selectedDonutCategoryId]);

    const selectDonutCategory = (categoryId) => {
        const selectedIndex = donutCategories.findIndex((category) => category.id === categoryId);
        if (selectedIndex === -1) return;

        setSelectedDonutCategoryId(categoryId);
        setDonutInquiryPage(0);
        setDonutCategoryPage(Math.floor(selectedIndex / DONUT_CATEGORIES_PER_PAGE));
    };

    const formatDonutInquiryAge = (dateValue) => {
        const ageInHours = Math.max(1, Math.round((now - new Date(`${dateValue}T12:00:00`)) / 3600000));
        return ageInHours < 24 ? `${ageInHours} שעות` : `${Math.max(1, Math.floor(ageInHours / 24))} ימים`;
    };

    return {
        priorityData,
        donutCategories,
        visibleDonutCategories,
        hasHiddenDonutCategories,
        visibleDonutCategoryCards,
        selectedDonutCategory,
        visibleSelectedDonutInquiries,
        donutCategoryPage,
        setDonutCategoryPage,
        totalDonutCategoryPages,
        donutInquiryPage,
        setDonutInquiryPage,
        totalDonutInquiryPages,
        selectDonutCategory,
        formatDonutInquiryAge
    };
}

