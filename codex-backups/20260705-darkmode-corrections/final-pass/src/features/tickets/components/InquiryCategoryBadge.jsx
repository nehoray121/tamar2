import React from 'react';

const InquiryCategoryBadge = ({ category, compact = false }) => {
    if (!category || category.system || category.id === 'all') return null;

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-white font-black shadow-sm ${compact ? 'h-8 px-2.5 text-[11px]' : 'h-6 px-2 text-[10px]'}`}
            style={{ borderColor: `${category.color}55`, color: category.color, backgroundColor: `${category.color}0F` }}
            dir="rtl"
        >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
            <span className="max-w-[150px] truncate">{category.name}</span>
        </span>
    );
};

export default InquiryCategoryBadge;
