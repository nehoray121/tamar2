import React from 'react';

const InquiryCategoryBadge = ({ category, compact = false }) => {
    if (!category || category.system || category.id === 'all') return null;
    const color = category.color || '#64748B';

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg font-black shadow-sm ${compact ? 'h-8 px-2.5 text-[11px]' : 'h-6 px-2 text-[10px]'} ${category.archived ? 'opacity-70 grayscale-[20%]' : ''}`}
            style={{ color, backgroundColor: `${color}14` }}
            title={category.archived ? `${category.name} - בארכיון` : category.name}
            dir="rtl"
        >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="max-w-[130px] truncate">{category.name}</span>
            {category.archived && <span className="text-[9px] inquiry-muted-text">בארכיון</span>}
        </span>
    );
};

export default InquiryCategoryBadge;