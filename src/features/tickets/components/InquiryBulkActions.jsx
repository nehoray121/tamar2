import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryBulkActions = ({ active, selectedCount, categories, onStart, onCancel, onAssignCategory, onPin }) => (
    <>
        <button
            type="button"
            onClick={active ? onCancel : onStart}
            className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 text-[12px] font-black shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition focus:outline-none focus:ring-2 focus:ring-blue-400/30 ${
                active
                    ? 'border-[#3B82F6] bg-[#EAF4FF] text-[#2563EB]'
                    : 'border-[#C9E1FF] bg-white text-slate-700 hover:border-[#93C5FD] hover:bg-[#EAF4FF] hover:text-[#3B82F6]'
            }`}
        >
            <Icon name="check" className="h-3.5 w-3.5 text-[#3B82F6]" />
            בחירת פניות
        </button>

        {active && selectedCount > 0 && (
            <div className="fixed bottom-8 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#3B82F6] bg-white px-4 py-2 shadow-[0_18px_45px_rgba(37,99,235,0.22)]" dir="rtl">
                <span className="whitespace-nowrap text-[13px] font-black text-slate-900">נבחרו {selectedCount} פניות</span>
                <span className="h-6 w-px bg-[#C9E1FF]" aria-hidden="true" />

                <label className="relative flex h-9 items-center rounded-xl bg-[#EAF4FF] text-[12px] font-black text-[#2563EB] shadow-sm">
                    <Icon name="arrowRight" className="pointer-events-none absolute right-3 h-3.5 w-3.5" />
                    <select
                        defaultValue=""
                        onChange={(event) => {
                            if (event.target.value) {
                                onAssignCategory(event.target.value);
                                event.target.value = '';
                            }
                        }}
                        className="h-full appearance-none rounded-xl border border-[#C9E1FF] bg-transparent py-0 pl-7 pr-9 text-[12px] font-black outline-none"
                        aria-label="העבר פניות נבחרות לקטגוריה"
                    >
                        <option value="">העבר לקטגוריה</option>
                        {categories.filter((category) => !category.system).map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                    <Icon name="chevronDown" className="pointer-events-none absolute left-2.5 h-3 w-3" />
                </label>

                <button
                    type="button"
                    onClick={onPin}
                    className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-[#C9E1FF] bg-white px-3 text-[12px] font-black text-slate-700 shadow-sm transition hover:border-[#93C5FD] hover:bg-[#F8FBFF] focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                >
                    <Icon name="pin" className="h-3.5 w-3.5 text-[#3B82F6]" />
                    נעץ לראש
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    className="h-9 whitespace-nowrap rounded-xl px-2.5 text-[12px] font-black text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                >
                    בטל בחירה
                </button>
            </div>
        )}
    </>
);

export default InquiryBulkActions;
