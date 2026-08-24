import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const toolbarButton = 'inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-black shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/30';
const groupedActionButton = 'inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-black shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/30';
const activeGroupedButton = 'border-blue-500 bg-blue-500/12 text-[var(--color-primary)] ring-1 ring-inset ring-blue-500/35';

const InquiryBulkActions = ({
    active,
    selectedCount,
    currentPageCount = 0,
    currentPageSelected = false,
    totalMatchingCount = 0,
    allMatchingSelected = false,
    selectingAll = false,
    hasActiveFilters = false,
    categories,
    onStart,
    onCancel,
    onTogglePage,
    onSelectAllMatching,
    onClearAll,
    onAssignCategory,
    onPin,
    onUnpin,
    showCategoryAction = true,
    showPinActions = true,
    progress
}) => {
    const running = Boolean(
        progress && progress.completed < progress.total
    );

    const run = (operation) => Promise
        .resolve(operation())
        .catch(() => {});

    const allMatchingLabel = hasActiveFilters
        ? `בחר את כל ${totalMatchingCount} התוצאות המסוננות`
        : `בחר את כל ${totalMatchingCount} הפניות`;

    const allSelectedLabel = hasActiveFilters
        ? `כל ${totalMatchingCount} התוצאות המסוננות נבחרו`
        : `כל ${totalMatchingCount} הפניות נבחרו`;

    if (!active) {
        return (
            <button
                data-testid="board-bulk-toggle"
                type="button"
                onClick={onStart}
                className={toolbarButton}
            >
                <Icon
                    name="check"
                    className="h-3.5 w-3.5 text-[var(--color-primary)]"
                />
                בחירת פניות
            </button>
        );
    }

    return (
        <>
            <div className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/55 p-1">
                <button
                    data-testid="board-bulk-toggle"
                    type="button"
                    onClick={onCancel}
                    className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 text-[12px] font-black text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                >
                    <Icon
                        name="close"
                        className="h-3.5 w-3.5"
                    />
                    סיום בחירה
                </button>

                {currentPageCount > 0 && (
                    <button
                        type="button"
                        onClick={onTogglePage}
                        disabled={selectingAll || running}
                        className={`${groupedActionButton} ${
                            currentPageSelected
                                ? activeGroupedButton
                                : ''
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        <Icon
                            name={currentPageSelected ? 'check' : 'layers'}
                            className="h-3.5 w-3.5 text-[var(--color-primary)]"
                        />
                        {currentPageSelected
                            ? `כל ${currentPageCount} בעמוד נבחרו`
                            : 'בחר הכל בעמוד'}
                    </button>
                )}

                {totalMatchingCount > 0 && (
                    <button
                        type="button"
                        onClick={allMatchingSelected ? onClearAll : onSelectAllMatching}
                        disabled={selectingAll || running}
                        className={`${groupedActionButton} ${
                            allMatchingSelected
                                ? activeGroupedButton
                                : ''
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        {selectingAll ? (
                            <span
                                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                                aria-hidden="true"
                            />
                        ) : (
                            <Icon
                                name={allMatchingSelected ? 'check' : 'dashboard'}
                                className="h-3.5 w-3.5 text-[var(--color-primary)]"
                            />
                        )}

                        {selectingAll
                            ? hasActiveFilters
                                ? 'בוחר את כל התוצאות המסוננות...'
                                : 'בוחר את כל הפניות...'
                            : allMatchingSelected
                                ? allSelectedLabel
                                : allMatchingLabel}
                    </button>
                )}

                <span
                    className={`inline-flex h-9 min-w-[74px] items-center justify-center rounded-xl border px-3 text-[11px] font-black ${
                        selectedCount
                            ? 'border-blue-500/35 bg-blue-500/10 text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                >
                    {selectedCount} נבחרו
                </span>
            </div>

            {active && selectedCount > 0 && (
                <div
                    className="inquiry-selection-bar fixed bottom-8 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-2"
                    dir="rtl"
                >
                    <div className="whitespace-nowrap text-[13px] font-black inquiry-primary-text">
                        <div>נבחרו {selectedCount} פניות</div>

                        {progress && (
                            <div className="text-[10px] font-bold inquiry-muted-text">
                                {running
                                    ? `${progress.completed}/${progress.total} הושלמו`
                                    : `${progress.succeeded} הצליחו, ${progress.failed} נכשלו${
                                        progress.conflicts
                                            ? `, ${progress.conflicts} התנגשויות`
                                            : ''
                                    }`}
                            </div>
                        )}
                    </div>

                    <span
                        className="h-6 w-px bg-[var(--color-border-strong)]"
                        aria-hidden="true"
                    />

                    {showCategoryAction && (
                        <label className="inquiry-soft-panel relative flex h-9 items-center rounded-xl text-[12px] font-black text-[var(--color-primary)] shadow-sm">
                            <Icon
                                name="arrowRight"
                                className="pointer-events-none absolute right-3 h-3.5 w-3.5"
                            />

                            <select
                                data-testid="board-bulk-category"
                                defaultValue=""
                                disabled={running}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    event.target.value = '';

                                    if (value) {
                                        run(() => onAssignCategory(value));
                                    }
                                }}
                                className="inquiry-input-surface h-full appearance-none rounded-xl border py-0 pl-7 pr-9 text-[12px] font-black outline-none disabled:opacity-50"
                                aria-label="העבר פניות נבחרות לקטגוריה"
                            >
                                <option value="">העבר לקטגוריה</option>

                                {categories
                                    .filter(
                                        (category) => !category.system && !category.archived
                                    )
                                    .map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}

                                <option value="all">
                                    הסר קטגוריה
                                </option>
                            </select>

                            <Icon
                                name="chevronDown"
                                className="pointer-events-none absolute left-2.5 h-3 w-3"
                            />
                        </label>
                    )}

                    {showPinActions && (
                        <>
                            <button
                                type="button"
                                disabled={running}
                                onClick={() => run(onPin)}
                                className="inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-black shadow-sm transition disabled:opacity-50"
                            >
                                <Icon
                                    name="pin"
                                    className="h-3.5 w-3.5 text-[#3B82F6]"
                                />
                                נעץ בלוח
                            </button>

                            <button
                                type="button"
                                disabled={running}
                                onClick={() => run(onUnpin)}
                                className="inquiry-control flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-black shadow-sm transition disabled:opacity-50"
                            >
                                <Icon
                                    name="minus"
                                    className="h-3.5 w-3.5 text-[#3B82F6]"
                                />
                                הסר נעיצה
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={onClearAll}
                        disabled={running}
                        className="flex h-9 items-center whitespace-nowrap rounded-xl px-2.5 text-[12px] font-black inquiry-muted-text transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
                    >
                        סיום
                    </button>
                </div>
            )}
        </>
    );
};

export default InquiryBulkActions;
