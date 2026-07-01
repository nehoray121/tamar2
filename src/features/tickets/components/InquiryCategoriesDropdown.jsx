import React, { useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryCategoryDialog from './InquiryCategoryDialog.jsx';

const InquiryCategoriesDropdown = ({ categories, counts, selectedId, onSelect, onCreate, onRename, onDelete }) => {
    const [open, setOpen] = useState(false);
    const [dialog, setDialog] = useState(null);
    const selected = categories.find((category) => category.id === selectedId) || categories[0];

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen((value) => !value)} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border bg-white px-3.5 text-[12px] font-black text-slate-700 shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition ${open ? 'border-slate-950 ring-1 ring-slate-950' : 'border-[#C9E1FF] hover:border-[#93C5FD] hover:bg-[#EAF4FF] hover:text-[#3B82F6]'}`}>
                <Icon name="layers" className="h-3.5 w-3.5 text-blue-500" />
                {selected?.name || 'כל הפניות'}
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700">{counts[selectedId] ?? 0}</span>
                <Icon name="chevronDown" className="h-3 w-3 text-blue-500" />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-[280px] overflow-hidden rounded-2xl border border-[#C9E1FF] bg-white p-2 shadow-[0_18px_44px_rgba(37,99,235,0.18)]">
                    {categories.map((category) => (
                        <div key={category.id} className="flex items-center gap-1 rounded-xl transition hover:bg-blue-50">
                            <button type="button" onClick={() => { onSelect(category.id); setOpen(false); }} className="flex min-h-[42px] min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-right text-xs font-black text-slate-700">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                                <span className="truncate">{category.name}</span>
                                <span className="mr-auto rounded-md bg-blue-50 px-2 py-1 text-blue-600">{counts[category.id] ?? 0}</span>
                            </button>
                            {!category.system && (
                                <button type="button" onClick={() => setDialog({ mode: 'edit', category })} className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-blue-600">
                                    <Icon name="settings" className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => setDialog({ mode: 'create' })} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 px-3 py-2 text-xs font-black text-blue-600 transition hover:border-blue-300 hover:bg-blue-50">
                        <Icon name="plus" className="h-3.5 w-3.5" />
                        קטגוריה חדשה
                    </button>
                </div>
            )}

            <InquiryCategoryDialog
                open={Boolean(dialog)}
                mode={dialog?.mode}
                category={dialog?.category}
                onClose={() => setDialog(null)}
                onSubmit={async (payload) => {
                    if (dialog?.mode === 'edit') await onRename(dialog.category.id, payload);
                    else await onCreate(payload);
                    setDialog(null);
                }}
                onDelete={async (id) => {
                    await onDelete(id);
                    if (selectedId === id) onSelect('all');
                    setDialog(null);
                    setOpen(false);
                }}
            />
        </div>
    );
};

export default InquiryCategoriesDropdown;
