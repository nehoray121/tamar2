import React, { useRef, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryPinButton from './InquiryPinButton.jsx';
import InquiryCategoryBadge from './InquiryCategoryBadge.jsx';
import PortalMenu from '../../../components/common/PortalMenu.jsx';

const urgencyStyles = {
    high: 'border-red-300 bg-red-100 text-red-800 dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-200',
    medium: 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-200',
    low: 'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-400/40 dark:bg-fuchsia-500/20 dark:text-fuchsia-200'
};

const submissionStatusStyles = {
    pending: {
        label: 'ממתין לאישור ',
        // label: 'מחכה לקבלה',
        icon: 'clock',
        className:
            'border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
        iconWrapClassName:
            'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100'
    },
    processing: {
        label: 'בטיפול',
        icon: 'activity',
        className:
            'border-blue-200/90 bg-blue-50 text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200',
        iconWrapClassName:
            'bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-100 '
    },
    done: {
        label: 'טופלה',
        icon: 'check',
        className:
            'border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
        iconWrapClassName:
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100'
    }
};

const getUrgencyType = (priority = '') => {
    if (priority.includes('גבוהה')) return 'high';
    if (priority.includes('בינונית')) return 'medium';
    return 'low';
};

const getSubmissionStatus = (ticket) => (
    ticket?.submissionStatus && submissionStatusStyles[ticket.submissionStatus]
        ? ticket.submissionStatus
        : null
);

const LightBlueIcon = ({ children }) => (
    <span className="inquiry-icon-chip flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
        {children}
    </span>
);

const InquiryUrgencyBadge = ({ priority }) => (
    <span className={`inline-flex h-6 min-w-[82px] items-center justify-center rounded-lg border px-2.5 text-[10px] font-black shadow-sm ${urgencyStyles[getUrgencyType(priority)]}`}>
        {priority}
    </span>
);

const InquirySubmissionStatusBadge = ({ status }) => {
    const config = submissionStatusStyles[status] || submissionStatusStyles.pending;

    return (
        <span
            className={`inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[10px] font-black ${config.className}`}
            dir="rtl"
        >
            <span className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md ${config.iconWrapClassName}`} aria-hidden="true">
                <Icon name={config.icon} className="h-4 w-4" />
            </span>
            <span>{config.label}</span>
        </span>
    );
};

const InquiryRowField = ({ icon, value, className = '' }) => (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
        <LightBlueIcon>
            {icon === 'hash' ? <span className="text-xs font-black leading-none">#</span> : <Icon name={icon} className="h-3 w-3" />}
        </LightBlueIcon>
        <span className="inquiry-secondary-text truncate text-[12px] font-bold">{value}</span>
    </div>
);

const isInteractiveElement = (target) => Boolean(target?.closest?.('button, a, input, select, textarea, label, [role="button"], [data-interactive="true"]'));

const SelectionCheckbox = ({ ticketId, selected, onToggleSelection }) => (
    <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center" onClick={(event) => event.stopPropagation()}>
        <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelection}
            className="peer sr-only"
            aria-label={`בחר פנייה ${ticketId}`}
        />
        <span className="inquiry-input-surface flex h-4 w-4 items-center justify-center rounded-[4px] border text-transparent transition peer-focus:ring-2 peer-focus:ring-blue-400/30 peer-checked:border-[#3B82F6] peer-checked:text-[#3B82F6]">
            <Icon name="check" className="h-3 w-3" />
        </span>
    </label>
);

const ActionIconButton = ({ title, className = '', icon, onClick, disabled }) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
        }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
        <Icon name={icon} className="h-4 w-4" />
    </button>
);

const RowMenu = ({ ticket, categories, onAssignCategory, onClose }) => {
    const assignableCategories = categories.filter((item) => !item.system && !item.archived && item.id !== ticket.categoryId);

    return (
        <div className="inquiry-menu-surface w-56 overflow-hidden rounded-2xl p-1.5 text-right" dir="rtl">
            {onAssignCategory && (
                <>
                    <div className="px-2 py-1.5 text-[11px] font-black inquiry-muted-text">שינוי קטגוריה</div>
                    {assignableCategories.map((item) => (
                        <button
                            key={item.id}
                            data-testid="board-item-category-option"
                            data-category-id={item.id}
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                Promise.resolve(onAssignCategory(ticket.boardItemId, item.id)).catch(() => {});
                                onClose();
                            }}
                            className="inquiry-menu-item flex min-h-[34px] w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-black transition"
                        >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        </button>
                    ))}
                    {ticket.categoryId && (
                        <button
                            data-testid="board-item-category-remove"
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                Promise.resolve(onAssignCategory(ticket.boardItemId, 'all')).catch(() => {});
                                onClose();
                            }}
                            className="inquiry-menu-item mt-1 flex min-h-[34px] w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-black transition"
                        >
                            <Icon name="close" className="h-3.5 w-3.5" />
                            הסר קטגוריה
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

const InquiryListRow = ({
    ticket,
    viewType,
    toggleState,
    onView,
    categories = [],
    category,
    onTogglePin,
    onAssignCategory,
    onCloseInquiry,
    loading,
    selectionMode,
    selected,
    onToggleSelection,
    manualMode,
    draggable,
    onDragStart,
    onDragOver,
    onDrop,
    onEnterSelectionMode
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const triggerRef = useRef(null);
    const showCloseAction = viewType === 'open' && Boolean(onCloseInquiry);
    const shouldShowExternalSubmissionStatus = viewType === 'external' && toggleState === 'sent' && (ticket?.isOutgoingExternal ?? true);
    const submissionStatus = shouldShowExternalSubmissionStatus ? getSubmissionStatus(ticket) : null;

    const gridCols = [
        selectionMode ? '40px' : '',
        manualMode ? '40px' : '',
        'minmax(100px, 1.2fr)',
        '85px',
        'minmax(110px, 1.2fr)',
        'minmax(110px, 1.5fr)',
        'minmax(110px, 1.2fr)',
        'minmax(100px, 1.2fr)',
        '160px',
        '260px'
    ].filter(Boolean).join(' ');

    return (
        <article
            data-testid="board-item-row"
            data-board-item-id={ticket.boardItemId}
            data-board-type={ticket.boardType}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDoubleClick={(event) => {
                if (isInteractiveElement(event.target)) return;
                onEnterSelectionMode?.(ticket.boardItemId);
            }}
            className={`group grid min-h-[56px] w-full items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2 transition ${selected ? 'inquiry-row-surface inquiry-row-selected' : 'inquiry-row-surface'}`}
            style={{ gridTemplateColumns: gridCols }}
        >
            {selectionMode && (
                <div className="flex justify-center">
                    <SelectionCheckbox ticketId={ticket.displayId || ticket.ticketId} selected={selected} onToggleSelection={onToggleSelection} />
                </div>
            )}

            {manualMode && (
                <div className="flex justify-center">
                    <span className="inquiry-soft-panel flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-xl inquiry-muted-text">
                        <Icon name="grip" className="h-4 w-4" />
                    </span>
                </div>
            )}

            <InquiryRowField icon="hash" value={ticket.displayId || ticket.ticketId} className="min-w-0" />

            <div className="flex">
                <InquiryUrgencyBadge priority={ticket.priority} />
            </div>

            <InquiryRowField icon="location" value={ticket.room} className="min-w-0" />
            <InquiryRowField icon="user" value={ticket.name} className="min-w-0" />
            <InquiryRowField icon="phone" value={ticket.phone || 'לא זמין'} className="min-w-0" />
            <InquiryRowField icon="calendar" value={ticket.date} className="min-w-0" />

            <div className="flex min-w-0 items-center">
                {category ? <InquiryCategoryBadge category={category} compact /> : <div className="h-6" aria-hidden="true" />}
            </div>

            <div className="relative flex w-[260px] shrink-0 items-center justify-start gap-2" dir="ltr">
                {onAssignCategory && (
                <button
                    data-testid="board-item-category"
                    ref={triggerRef}
                    type="button"
                    title="שינוי קטגוריה"
                    aria-label={`שינוי קטגוריה לפנייה ${ticket.displayId || ticket.ticketId}`}
                    aria-expanded={menuOpen}
                    onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpen((value) => !value);
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition focus:outline-none bg-violet-200 hover:border-violet-400 dark:bg-violet-400/15 dark:border-violet-300/35 dark:text-violet-300 dark:hover:bg-violet-400/25 dark:hover:border-violet-300/50 ${menuOpen ? 'border-violet-500 dark:border-violet-300' : 'text-[#3B82F6] dark:text-violet-900'}`}
                >
                    <Icon name="folder" className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                </button>
                )}

                {showCloseAction && (
                    <ActionIconButton
                        title="סגור פנייה"
                        icon="check"
                        onClick={() => onCloseInquiry(ticket)}
                        className="border-emerald-100 bg-emerald-100 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-200 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/30"
                    />
                )}

                <ActionIconButton
                    title="צפה בפנייה"
                    icon="eye"
                    onClick={() => onView(ticket)}
                    className="border-blue-100 bg-blue-100 text-blue-700 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:bg-blue-500/30"
                />

                {(onTogglePin || ticket.pinned) && (
                    <InquiryPinButton
                        testId="board-item-pin"
                        pinned={ticket.pinned}
                        loading={loading}
                        readOnly={!onTogglePin}
                        onClick={() => Promise.resolve(onTogglePin?.(ticket.boardItemId)).catch(() => {})}
                    />
                )}

{submissionStatus && (
    <InquirySubmissionStatusBadge status={submissionStatus} />
)}
                {onAssignCategory && (
                <PortalMenu anchorRef={triggerRef} open={menuOpen} onClose={() => setMenuOpen(false)}>
                    <RowMenu ticket={ticket} categories={categories} onAssignCategory={onAssignCategory} onClose={() => setMenuOpen(false)} />
                </PortalMenu>
                )}
            </div>
        </article>
    );
};

export { InquiryListRow, InquiryRowField, InquiryUrgencyBadge, InquirySubmissionStatusBadge, LightBlueIcon };