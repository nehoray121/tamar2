import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryBulkActions = ({ active, selectedCount, categories, onStart, onCancel, onAssignCategory, onClearCategory, onPin, onUnpin }) => {
    if (!active) {
        return (
            <button type="button" onClick={onStart} className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#C9E1FF] bg-white px-3.5 text-[12px] font-black text-slate-700 shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition hover:border-[#93C5FD] hover:bg-[#EAF4FF] hover:text-[#3B82F6]">
                <Icon name="check" className="h-3.5 w-3.5 text-blue-500" />
                בחירת פניות
            </button>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-2.5 py-1.5 shadow-[0_4px_12px_rgba(37,99,235,0.08)]">
            <span className="px-2 text-xs font-black text-blue-800">{selectedCount} נבחרו</span>
            <select disabled={!selectedCount} onChange={(event) => event.target.value && onAssignCategory(event.target.value)} defaultValue="" className="h-8 rounded-lg border border-blue-100 bg-white px-2 text-xs font-black text-slate-700">
                <option value="">שיוך לקטגוריה</option>
                {categories.filter((category) => !category.system).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <button type="button" disabled={!selectedCount} onClick={onClearCategory} className="h-8 rounded-lg bg-white px-2 text-xs font-black text-slate-600 disabled:opacity-40">הסר קטגוריה</button>
            <button type="button" disabled={!selectedCount} onClick={onPin} className="h-8 rounded-lg bg-cyan-500 px-2 text-xs font-black text-white disabled:opacity-40">נעץ</button>
            <button type="button" disabled={!selectedCount} onClick={onUnpin} className="h-8 rounded-lg bg-white px-2 text-xs font-black text-cyan-600 disabled:opacity-40">בטל נעיצה</button>
            <button type="button" onClick={onCancel} className="h-8 rounded-lg border border-blue-100 bg-white px-2 text-xs font-black text-slate-500">ביטול</button>
        </div>
    );
};

export default InquiryBulkActions;
