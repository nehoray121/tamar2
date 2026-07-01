import React, { useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';

const colors = ['#F97316', '#06B6D4', '#EF4444', '#EC4899', '#22C55E', '#8B5CF6'];

const InquiryCategoryDialog = ({ open, mode, category, onClose, onSubmit, onDelete }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(colors[0]);

    useEffect(() => {
        if (!open) return;
        setName(category?.name || '');
        setColor(category?.color || colors[0]);
    }, [category, open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/30 p-4" dir="rtl" onMouseDown={onClose}>
            <div className="w-full max-w-sm rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 text-slate-400">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                    <h3 className="text-base font-black text-slate-950">{mode === 'edit' ? 'עריכת קטגוריה' : 'יצירת קטגוריה'}</h3>
                </div>

                <label className="mb-3 block text-sm font-black text-slate-800">
                    שם קטגוריה
                    <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-blue-100 px-3 text-sm font-bold outline-none focus:border-blue-500" />
                </label>

                <div className="mb-5">
                    <div className="mb-2 text-sm font-black text-slate-800">צבע</div>
                    <div className="flex gap-2">
                        {colors.map((item) => (
                            <button key={item} type="button" onClick={() => setColor(item)} className={`h-8 w-8 rounded-full border-2 ${color === item ? 'border-slate-900' : 'border-white'}`} style={{ backgroundColor: item }} />
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                    {mode === 'edit' && !category?.system ? (
                        <button type="button" onClick={() => window.confirm('למחוק את הקטגוריה? הפניות לא יימחקו.') && onDelete(category.id)} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600">מחיקה</button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">ביטול</button>
                        <button type="button" onClick={() => onSubmit({ name, color })} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white">שמירה</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryCategoryDialog;
