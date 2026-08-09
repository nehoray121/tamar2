import React, { useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryCategoryDialog from './InquiryCategoryDialog.jsx';

const InquiryCategoriesDropdown = ({
    categories,
    counts,
    selectedId,
    onSelect,
    onCreate,
    onRename,
    onDelete,
    canManage = true,
    loading = false,
    boardLabel = ''
}) => {
    const [open, setOpen] = useState(false);
    const [dialog, setDialog] = useState(null);
    const selected = categories.find((category) => category.id === selectedId) || categories[0];
    const selectedCount = counts[selectedId];

    return (
        <div className="relative">
            <button
                data-testid="board-category-menu"
                type="button"
                onClick={() => setOpen((value) => !value)}
                className={`inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[12px] font-black shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition ${open ? 'inquiry-control--active ring-1 ring-blue-400/40' : ''}`}
            >
                <Icon name="layers" className="h-3.5 w-3.5 text-blue-500" />
                {selected?.name || 'כל הפניות'}
                {Number.isFinite(selectedCount) && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{selectedCount}</span>}
                <Icon name="chevronDown" className="h-3 w-3 text-blue-500" />
            </button>

            {open && (
                <div className="inquiry-menu-surface absolute right-0 top-full z-50 mt-1.5 w-[280px] overflow-hidden rounded-2xl p-2">
                    {boardLabel && <div className="px-2 pb-1 text-[10px] font-bold inquiry-muted-text">קטגוריות משותפות: {boardLabel}</div>}
                    {categories.map((category) => {
                        const canEdit = canManage && !category.system && !category.archived;
                        const count = counts[category.id];
                        return (
                            <div key={category.id} className="group relative rounded-xl transition">
                                <button
                                    data-testid="board-category-option"
                                    data-category-id={category.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(category.id);
                                        setOpen(false);
                                    }}
                                    className={`inquiry-menu-item flex min-h-[42px] w-full min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-right text-xs font-black transition ${canEdit ? 'md:group-hover:pl-10 md:group-focus-within:pl-10' : ''}`}
                                >
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color || '#94A3B8' }} />
                                    <span className="truncate">{category.name}</span>
                                    {Number.isFinite(count) && <span className="mr-auto rounded-md bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">{count}</span>}
                                </button>

                                {canEdit && (
                                    <button
                                        data-testid="board-category-edit"
                                        data-category-id={category.id}
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setDialog({ mode: 'edit', category });
                                        }}
                                        title="עריכת קטגוריה"
                                        aria-label={`עריכת קטגוריה ${category.name}`}
                                        className="inquiry-control absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md p-0 text-slate-400 opacity-0 transition-all duration-150 hover:text-blue-600 focus-visible:text-blue-600 group-hover:opacity-100 group-focus-within:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto md:group-focus-within:pointer-events-auto"
                                    >
                                        <Icon name="edit" className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {canManage && (
                        <button
                            data-testid="board-category-create"
                            type="button"
                            onClick={() => setDialog({ mode: 'create' })}
                            className="theme-add-card mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs font-black transition"
                        >
                            <Icon name="plus" className="h-3.5 w-3.5" />
                            קטגוריה חדשה
                        </button>
                    )}
                </div>
            )}

            <InquiryCategoryDialog
                open={Boolean(dialog)}
                mode={dialog?.mode}
                category={dialog?.category}
                loading={loading}
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