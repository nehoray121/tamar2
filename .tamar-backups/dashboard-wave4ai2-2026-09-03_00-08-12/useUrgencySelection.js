import { useEffect, useMemo, useState } from 'react';
import { DONUT_CATEGORIES_PER_PAGE, DONUT_INQUIRIES_PER_PAGE } from '../constants/dashboard.constants.js';

const DONUT_MAX_VISIBLE_CATEGORIES = 10;
const DONUT_COLOR_PALETTE = [
    '#F94144', '#F59E0B', '#EC4899', '#3B82F6', '#10B981',
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'
];

export function useUrgencySelection({ donutSource, prioritySource = [], expandedSection, now }) {
    const [selectedDonutCategoryId, setSelectedDonutCategoryId] = useState(null);
    const [donutCategoryPage, setDonutCategoryPage] = useState(0);
    const [donutInquiryPage, setDonutInquiryPage] = useState(0);

    const allPriorityData = useMemo(() => {
        if (prioritySource.length) {
            return prioritySource.filter((item) => item.value > 0).map((item, index) => ({
                label: item.label,
                rawLabel: item.rawLabel || item.label,
                value: item.value,
                color: item.color || DONUT_COLOR_PALETTE[index % DONUT_COLOR_PALETTE.length],
                priorityLevel: index
            }));
        }
        const grouped = new Map();

        donutSource.forEach((item) => {
            const label = item.priority || 'לא מסווג';
            const knownPriority = undefined;
            const current = grouped.get(label) || {
                label,
                rawLabel: label,
                value: 0,
                color: item.chartColor || knownPriority?.chartColor || '',
                priorityLevel: item.priorityLevel ?? knownPriority?.priorityLevel ?? knownPriority?.level ?? 999
            };

            current.value += 1;
            current.color = current.color || item.chartColor || knownPriority?.chartColor || '';
            current.priorityLevel = Math.min(current.priorityLevel, item.priorityLevel ?? knownPriority?.priorityLevel ?? knownPriority?.level ?? 999);
            grouped.set(label, current);
        });

        return Array.from(grouped.values())
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value || a.priorityLevel - b.priorityLevel || a.label.localeCompare(b.label, 'he'))
            .map((item, index) => ({
                ...item,
                color: item.color || DONUT_COLOR_PALETTE[index % DONUT_COLOR_PALETTE.length]
            }));
    }, [donutSource, prioritySource]);

    const priorityData = useMemo(() => allPriorityData.slice(0, DONUT_MAX_VISIBLE_CATEGORIES), [allPriorityData]);
    const totalDonutInquiries = useMemo(() => allPriorityData.reduce((sum, item) => sum + item.value, 0), [allPriorityData]);
    const hiddenDonutCategoryCount = Math.max(0, allPriorityData.length - priorityData.length);
    const hiddenDonutInquiryCount = allPriorityData.slice(DONUT_MAX_VISIBLE_CATEGORIES).reduce((sum, item) => sum + item.value, 0);

    const donutCategories = useMemo(() => {
        const total = totalDonutInquiries;

        return priorityData.map((item) => {
            const inquiriesByCategory = donutSource
                .filter((inquiry) => (inquiry.priority || 'לא מסווג') === item.rawLabel)
                .sort((a, b) => (a.priorityLevel ?? 999) - (b.priorityLevel ?? 999) || b.date.localeCompare(a.date));
            const percentage = total > 0 ? (item.value / total) * 100 : 0;

            return {
                ...item,
                id: item.rawLabel,
                shortLabel: item.label.replace(/-\d+$/, ''),
                inquiries: inquiriesByCategory,
                percentage,
                formattedPercentage: Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1),
                lightColor: item.color + '12',
                borderColor: item.color + '40'
            };
        });
    }, [priorityData, donutSource, totalDonutInquiries]);

    const visibleDonutCategories = expandedSection === 'donut' ? priorityData : priorityData.slice(0, 4);
    const hasHiddenDonutCategories = hiddenDonutCategoryCount > 0 || (expandedSection !== 'donut' && priorityData.length > 4);
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
        const ageInHours = Math.max(1, Math.round((now - new Date(dateValue + 'T12:00:00')) / 3600000));
        return ageInHours < 24 ? ageInHours + ' שעות' : Math.max(1, Math.floor(ageInHours / 24)) + ' ימים';
    };

    return {
        priorityData,
        donutCategories,
        visibleDonutCategories,
        hasHiddenDonutCategories,
        hiddenDonutCategoryCount,
        hiddenDonutInquiryCount,
        totalDonutCategoryCount: allPriorityData.length,
        totalDonutInquiries,
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
