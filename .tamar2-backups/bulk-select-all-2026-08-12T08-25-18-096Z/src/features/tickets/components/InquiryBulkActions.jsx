import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryBulkActions = ({
    active,
    selectedCount,
    allMatchingCount = 0,
    allMatchingSelected = false,
    categories,
    onStart,
    onCancel,
    onSelectAll,
    onClearAll,
    onAssignCategory,
    onPin,
    onUnpin,
    showCategoryAction = true,
    showPinActions = true,
    progress
}) => {
    const running = Boolean(progress && progress.completed < progress.total);
    const run = (operation) => Promise.resolve(operation()).catch(() => {});

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    data-testid="board-bulk-toggle"
                    type="button"
                    onClick={active ? onCancel : onStart}
                    className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[12px] font-black shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition focus:outline-none focus:ring-2 focus:ring-blue-400/30 ${active ? 'inquiry-control inquiry-control--active' : 'inquiry-control'}`}
                >
                    <Icon name="check" className="h-3.5 w-3.5 text-[#3B82F6]" />
                    בחירת פניות
                </button>

                {active && allMatchingCount > 0 && (
                    <button type="button" onClick={allMatchingSelected ? onClearAll : onSelectAll} className="inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-black shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/30">
                        <Icon name={allMatchingSelected ? 'close' : 'check'} className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                        {allMatchingSelected ? 'בטל בחירת העמוד' : `בחר ${allMatchingCount} בעמוד`}
                    </button>
                )}
            </div>

            {active && selectedCount > 0 && (
                <div className="inquiry-selection-bar fixed bottom-8 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-2" dir="rtl">
                    <div className="whitespace-nowrap text-[13px] font-black inquiry-primary-text">
                        <div>נבחרו {selectedCount} פניות</div>
                        {progress && <div className="text-[10px] font-bold inquiry-muted-text">{running ? `${progress.completed}/${progress.total} הושלמו` : `${progress.succeeded} הצליחו, ${progress.failed} נכשלו${progress.conflicts ? `, ${progress.conflicts} התנגשויות` : ''}`}</div>}
                    </div>
                    <span className="h-6 w-px bg-[var(--color-border-strong)]" aria-hidden="true" />

                    {showCategoryAction && (
                        <label className="inquiry-soft-panel relative flex h-9 items-center rounded-xl text-[12px] font-black text-[var(--color-primary)] shadow-sm">
                            <Icon name="arrowRight" className="pointer-events-none absolute right-3 h-3.5 w-3.5" />
                            <select
                                data-testid="board-bulk-category"
                                defaultValue=""
                                disabled={running}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    event.target.value = '';
                                    if (value) run(() => onAssignCategory(value));
                                }}
                                className="inquiry-input-surface h-full appearance-none rounded-xl border py-0 pl-7 pr-9 text-[12px] font-black outline-none disabled:opacity-50"
                                aria-label="העבר פניות נבחרות לקטגוריה"
                            >
                                <option value="">העבר לקטגוריה</option>
                                {categories.filter((category) => !category.system && !category.archived).map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                                <option value="all">הסר קטגוריה</option>
                            </select>
                            <Icon name="chevronDown" className="pointer-events-none absolute left-2.5 h-3 w-3" />
                        </label>
                    )}

                    {showPinActions && (
                        <>
                            <button type="button" disabled={running} onClick={() => run(onPin)} className="inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-black shadow-sm transition disabled:opacity-50">
                                <Icon name="pin" className="h-3.5 w-3.5 text-[#3B82F6]" />
                                נעץ בלוח
                            </button>
                            <button type="button" disabled={running} onClick={() => run(onUnpin)} className="inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-black shadow-sm transition disabled:opacity-50">
                                <Icon name="minus" className="h-3.5 w-3.5 text-[#3B82F6]" />
                                הסר נעיצה
                            </button>
                        </>
                    )}

                    <button type="button" onClick={onClearAll} disabled={running} className="flex h-9 items-center whitespace-nowrap rounded-xl px-2.5 text-[12px] font-black inquiry-muted-text transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50">סיום</button>
                </div>
            )}
        </>
    );
};

export default InquiryBulkActions;