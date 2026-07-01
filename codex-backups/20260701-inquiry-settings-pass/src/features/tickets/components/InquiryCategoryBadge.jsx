import React from 'react';

const InquiryCategoryBadge = ({ category }) => {
    if (!category) return null;
    return (
        <span className="inline-flex h-6 items-center gap-1.5 rounded-lg border bg-white px-2 text-[10px] font-black text-slate-700 shadow-sm" style={{ borderColor: `${category.color}55`, color: category.color }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
            {category.name}
        </span>
    );
};

export default InquiryCategoryBadge;
