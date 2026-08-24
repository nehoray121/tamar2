import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageLoadingState.jsx';
import TicketModal from './TicketModal.jsx';
import { InquiryListRow } from '../../features/tickets/components/InquiryListRow.jsx';
import InquiryCategoriesDropdown from '../../features/tickets/components/InquiryCategoriesDropdown.jsx';
import InquiryBulkActions from '../../features/tickets/components/InquiryBulkActions.jsx';
import CloseInquiryDialog from '../../features/tickets/components/CloseInquiryDialog.jsx';
import { useInquiryOrganization } from '../../features/tickets/hooks/useInquiryOrganization.js';
import { resolveBoardTypeFromView } from '../../features/tickets/boards/domain/boardTypes.js';
import { INQUIRY_RUNTIME_STATE } from '../../features/tickets/boards/domain/inquiryRuntimeState.js';
import { useRoomSettings } from '../../features/settings/hooks/useRoomSettings.js';

const toolbarButton = 'inquiry-control flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[12px] font-black shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition';
const dropdownMenu = 'inquiry-menu-surface absolute top-full z-[100] mt-2 rounded-xl py-1 shadow-2xl';
const priorityValues = {
    'דחיפות גבוהה': 'HIGH',
    'דחיפות בינונית': 'MEDIUM',
    'דחיפות נמוכה': 'LOW'
};
const pinLabels = { ALL: 'כל הפניות', PINNED: 'נעוצות', UNPINNED: 'לא נעוצות' };

const RuntimeStatePanel = ({ state, onAction }) => {
    const loading = [INQUIRY_RUNTIME_STATE.AUTH_LOADING, INQUIRY_RUNTIME_STATE.INITIAL_LOADING].includes(state.kind);
    const error = [INQUIRY_RUNTIME_STATE.AUTH_ERROR, INQUIRY_RUNTIME_STATE.API_ERROR, INQUIRY_RUNTIME_STATE.CONTEXT_ERROR].includes(state.kind);
    const actionLabel = state.action === 'select_room'
        ? 'בחירת חדר'
        : state.action === 'retry_auth'
            ? 'בדיקה מחדש'
            : state.action === 'retry_board'
                ? 'נסה שוב'
                : '';
    const iconName = loading ? 'history' : error ? 'shield' : 'filePlus';

    return (
        <section
            data-testid={`inquiry-runtime-state-${state.kind}`}
            className={`flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center ${error ? 'border-red-400/35 bg-red-500/[0.035]' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]'}`}
            role={error ? 'alert' : 'status'}
            aria-live={error ? 'assertive' : 'polite'}
        >
            <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${error ? 'bg-red-500/10 text-red-500' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'}`}>
                {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : <Icon name={iconName} className="h-5 w-5" />}
            </span>
            <h2 className="text-base font-black text-[var(--color-text-primary)]">{state.title}</h2>
            {state.message && <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">{state.message}</p>}
            {state.requestId && <p className="mt-2 text-[11px] font-bold text-[var(--color-text-muted)]">מזהה פנייה: {state.requestId}</p>}
            {actionLabel && (
                <button data-testid="inquiry-runtime-action" type="button" onClick={onAction} className="mt-5 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-sm font-black text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
                    {actionLabel}
                </button>
            )}
        </section>
    );
};

const TicketListPage = ({ title, description, showToggle = false, viewType = 'default' }) => {
    const [toggleState, setToggleState] = useState('received');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [closingTicket, setClosingTicket] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
    const [pinDropdownOpen, setPinDropdownOpen] = useState(false);
    const [sortBy, setSortBy] = useState('מספר פנייה ↑↓');
    const [priorityFilter, setPriorityFilter] = useState('בחר דחיפות');
    const [pinMode, setPinMode] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const { settings, loaded: settingsLoaded, loadError: settingsLoadError, reload: reloadSettings } = useRoomSettings();
    const pageSize = Number(settings.general?.inquiriesPerPage) || 7;
    const closeSound = settings.general?.closeSound || 'off';
    const boardType = resolveBoardTypeFromView({ viewType, toggleState });
    const externalBoard = boardType?.startsWith('EXTERNAL_');
    const showPinFilter = false;
    const serverQuery = useMemo(() => {
        const chronologicalSort = externalBoard ? 'initiatedAt' : 'createdAt';
        return {
            page: currentPage,
            limit: pageSize,
            search: deferredSearchQuery || undefined,
            priority: priorityValues[priorityFilter],
            pinMode: showPinFilter ? pinMode : undefined,
            sortBy: sortBy === 'מספר פנייה ↑↓' ? 'ticketNumber' : chronologicalSort,
            sortDirection: sortBy === 'ישן יותר' ? 'asc' : 'desc'
        };
    }, [currentPage, deferredSearchQuery, externalBoard, pageSize, pinMode, showPinFilter, priorityFilter, sortBy]);
    const organization = useInquiryOrganization({ viewType, toggleState, query: serverQuery });

    const displayTitle = organization.roomName ? `${title} - ${organization.roomName}` : title;

    const closeAllDropdowns = () => {
        setSortDropdownOpen(false);
        setPriorityDropdownOpen(false);
        setPinDropdownOpen(false);
    };
    const categoryById = useMemo(
        () => new Map(organization.rawCategories.map((category) => [category.id, category])),
        [organization.rawCategories]
    );
    const visibleItems = organization.tickets;
    const currentPageIds = useMemo(() => visibleItems.map((item) => item.boardItemId), [visibleItems]);
    const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => organization.selectedIds.includes(id));
    const totalPages = Math.max(1, organization.pagination.totalPages || 1);
    const canAssignCategories = organization.capabilities.canChangeCategory;
    const canPin = organization.capabilities.canChangePin;
    const showCategoryNavigation = Boolean(organization.boardType);

    useEffect(() => {
        setCurrentPage(1);
    }, [deferredSearchQuery, pageSize, pinMode, priorityFilter, toggleState, viewType]);

    useEffect(() => {
        if (!showPinFilter) setPinDropdownOpen(false);
    }, [showPinFilter]);

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        if (organization.selectionMode) closeAllDropdowns();
    }, [organization.selectionMode]);

    if (settingsLoadError) {
        return (
            <div className="inquiry-page-surface relative flex h-full min-h-0 flex-col overflow-hidden overflow-x-hidden p-4" dir="rtl">
                <PageErrorState onRetry={reloadSettings} />
            </div>
        );
    }

    if (!settingsLoaded) {
        return (
            <div className="inquiry-page-surface relative flex h-full min-h-0 flex-col overflow-hidden overflow-x-hidden p-4" dir="rtl">
                <PageLoadingState />
            </div>
        );
    }

    const priorityOptions = ['בחר דחיפות', 'דחיפות גבוהה', 'דחיפות בינונית', 'דחיפות נמוכה'];
    const sortOptions = ['מספר פנייה ↑↓', 'חדש יותר', 'ישן יותר'];

    return (
        <div className="inquiry-page-surface relative flex h-full min-h-0 flex-col overflow-hidden overflow-x-hidden p-4" dir="rtl">
            {(!organization.selectionMode && (sortDropdownOpen || priorityDropdownOpen || (showPinFilter && pinDropdownOpen))) && <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />}

            <PageHeader title={displayTitle} description={description} toggleState={toggleState} setToggleState={setToggleState} showToggle={showToggle} />

            <div className={`relative z-[80] mb-3 shrink-0 flex-nowrap items-center justify-between gap-3 overflow-visible ${organization.filtersAvailable ? 'flex' : 'hidden'}`}>
                <label className="inquiry-control flex h-9 min-w-[280px] flex-1 items-center rounded-xl px-3 shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400/20 lg:max-w-[600px]">
                    <input
                        value={searchQuery}
                        maxLength={100}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-full w-full bg-transparent py-2 pl-8 pr-1 text-[12px] font-semibold inquiry-secondary-text outline-none placeholder:inquiry-muted-text"
                        placeholder="חיפוש לפי מספר פנייה, נושא או תיאור..."
                    />
                    <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                </label>
                {organization.selectionMode && organization.hasActiveFilters && (
                    <div
                        className="selection-filter-indicator inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/12 px-3 text-[11px] font-black text-amber-700 dark:text-amber-200"
                        title="הבחירה חלה רק על התוצאות המסוננות לפי החיפוש והסינונים הנוכחיים"
                    >
                        <Icon name="filter" className="h-3.5 w-3.5" />
                        סינון פעיל
                    </div>
                )}


                <div className="flex min-w-max shrink-0 items-center gap-2 whitespace-nowrap overflow-visible">
                    {!organization.selectionMode && (
                        <>

                    {showCategoryNavigation && (
                        <InquiryCategoriesDropdown
                            categories={organization.categories}
                            counts={organization.categoryCounts}
                            selectedId={organization.selectedCategoryId}
                            onSelect={(categoryId) => {
                                organization.setSelectedCategoryId(categoryId);
                                setCurrentPage(1);
                            }}
                            onCreate={organization.createCategory}
                            onRename={organization.renameCategory}
                            onDelete={organization.deleteCategory}
                            canManage={organization.canManageCategories}
                            loading={organization.pendingCategoryIds.length > 0}
                            boardLabel={organization.boardLabel}
                        />
                    )}
                    <div className="relative shrink-0 overflow-visible">
                        <button onClick={() => { closeAllDropdowns(); setSortDropdownOpen(!sortDropdownOpen); }} className={toolbarButton}>
                            <Icon name="arrowDownUp" className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                            {sortBy}
                            <Icon name="chevronDown" className="h-3 w-3 text-[var(--color-primary)]" />
                        </button>
                        {sortDropdownOpen && (
                            <div className={`${dropdownMenu} right-0 w-44`}>
                                {sortOptions.map((option) => (
                                    <button key={option} onClick={() => { setSortBy(option); closeAllDropdowns(); }} className="inquiry-menu-item block w-full px-4 py-2 text-right text-xs font-bold transition">{option}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    {!externalBoard && (
                        <div className="relative shrink-0 overflow-visible">
                            <button onClick={() => { closeAllDropdowns(); setPriorityDropdownOpen(!priorityDropdownOpen); }} className={toolbarButton}>
                                <Icon name="filter" className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                                {priorityFilter}
                                <Icon name="chevronDown" className="h-3 w-3 text-[var(--color-primary)]" />
                            </button>
                            {priorityDropdownOpen && (
                                <div className={`${dropdownMenu} left-0 w-40`}>
                                    {priorityOptions.map((option) => (
                                        <button key={option} onClick={() => { setPriorityFilter(option); closeAllDropdowns(); }} className="inquiry-menu-item w-full px-4 py-2 text-right text-xs font-bold transition">{option}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {showPinFilter && (
                    <div className="relative shrink-0 overflow-visible">
                        <button onClick={() => { closeAllDropdowns(); setPinDropdownOpen(!pinDropdownOpen); }} className={toolbarButton}>
                            <Icon name="pin" className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                            {pinLabels[pinMode]}
                            <Icon name="chevronDown" className="h-3 w-3 text-[var(--color-primary)]" />
                        </button>
                        {pinDropdownOpen && (
                            <div className={`${dropdownMenu} left-0 w-36`}>
                                {Object.entries(pinLabels).map(([value, label]) => (
                                    <button key={value} onClick={() => { setPinMode(value); closeAllDropdowns(); }} className="inquiry-menu-item w-full px-4 py-2 text-right text-xs font-bold transition">{label}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    )}
                        </>
                    )}
{(canAssignCategories || canPin) && (
                        <InquiryBulkActions
                            active={organization.selectionMode}
                            selectedCount={organization.selectedIds.length}
                            currentPageCount={currentPageIds.length}
                            currentPageSelected={allPageSelected}
                            totalMatchingCount={organization.totalMatchingCount}
                            allMatchingSelected={organization.allMatchingSelected}
                            selectingAll={organization.selectingAll}
                            hasActiveFilters={organization.hasActiveFilters}
                            categories={organization.rawCategories}
                            onStart={() => {
                                closeAllDropdowns();
                                organization.setSelectionMode(true);
                            }}
                            onCancel={organization.clearSelection}
                            onTogglePage={() => organization.toggleCurrentPage(currentPageIds)}
                            onSelectAllMatching={organization.selectAllMatching}
                            onClearAll={organization.clearSelection}
                            onAssignCategory={organization.assignManyCategory}
                            onPin={() => organization.setManyPinned(true)}
                            onUnpin={() => organization.setManyPinned(false)}
                            showCategoryAction={canAssignCategories}
                            showPinActions={canPin}
                            progress={organization.bulkProgress}
                        />
                    )}
                </div>
            </div>

            {organization.viewState.kind === INQUIRY_RUNTIME_STATE.STALE && (
                <div data-testid="inquiry-runtime-stale" role="alert" className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-200">
                    <span>{organization.viewState.message}</span>
                    <div className="flex shrink-0 gap-2">
                        {organization.conflict && <button data-testid="board-conflict-retry" type="button" onClick={organization.retryConflict} className="rounded-lg border border-current px-2 py-1">נסה שוב עם הגרסה העדכנית</button>}
                        <button type="button" onClick={organization.retryCurrentState} className="rounded-lg border border-current px-2 py-1">נסה שוב</button>
                    </div>
                </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden pr-1" aria-busy={organization.loading || organization.refreshing}>
                {organization.viewState.blocking ? (
                    <RuntimeStatePanel state={organization.viewState} onAction={organization.retryCurrentState} />
                ) : visibleItems.length > 0 ? visibleItems.map((task) => (
                    <InquiryListRow
                        key={task.rowKey}
                        ticket={task}
                        viewType={viewType}
                        toggleState={toggleState}
                        categories={organization.rawCategories}
                        category={task.category || categoryById.get(task.categoryId)}
                        onTogglePin={task.canChangePin ? organization.togglePin : undefined}
                        onAssignCategory={task.canChangeCategory ? organization.assignCategory : undefined}
                        onCloseInquiry={viewType === 'open' ? setClosingTicket : undefined}
                        loading={organization.loadingIds.includes(task.boardItemId)}
                        selectionMode={organization.selectionMode}
                        selected={organization.selectedIds.includes(task.boardItemId)}
                        onToggleSelection={() => organization.toggleSelection(task.boardItemId)}
                        onEnterSelectionMode={() => organization.startSelectionWith(task.boardItemId)}
                            onView={setSelectedTicket}
    tableFields={settings.tableFields || []}
    fieldDefinitions={settings.fields || []}
/>

                )) : (
                    <RuntimeStatePanel state={organization.viewState} onAction={organization.retryCurrentState} />
                )}
            </div>

            <div className={`mt-3 shrink-0 items-center justify-center gap-3 border-t border-[var(--color-border-strong)]/70 pt-3 dark:border-none ${organization.filtersAvailable ? 'flex' : 'hidden'}`}>
                <button disabled={currentPage <= 1 || organization.loading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="inquiry-control rounded-lg px-4 py-1.5 text-xs font-bold shadow-[0_3px_10px_rgba(37,99,235,0.08)] disabled:cursor-not-allowed disabled:opacity-50">&lt; קודם</button>
                <div className="inquiry-control inquiry-control--active rounded-lg px-8 py-1.5 text-xs font-bold shadow-[0_3px_10px_rgba(37,99,235,0.08)]">עמוד {currentPage} מתוך {totalPages}</div>
                <button disabled={currentPage >= totalPages || organization.loading} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="inquiry-control rounded-lg px-4 py-1.5 text-xs font-bold shadow-[0_3px_10px_rgba(37,99,235,0.08)] disabled:cursor-not-allowed disabled:opacity-50">הבא &gt;</button>
            </div>

            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    viewType={viewType}
                    transferContext={toggleState}
                    onClose={() => setSelectedTicket(null)}
                    onCloseInquiry={() => setClosingTicket(selectedTicket)}
                    onTransferred={() => {
                        setSelectedTicket(null);
                        organization.refresh();
                    }}
                    onUpdated={() => organization.refresh()}
                />
            )}
            <CloseInquiryDialog
                open={Boolean(closingTicket)}
                ticket={closingTicket}
                closeSound={closeSound}
                onClose={() => setClosingTicket(null)}
                onClosed={(ticket) => {
                    setSelectedTicket((current) => current?.ticketId === ticket.id ? null : current);
                    organization.refresh();
                }}
            />
        </div>
    );
};

export default TicketListPage;