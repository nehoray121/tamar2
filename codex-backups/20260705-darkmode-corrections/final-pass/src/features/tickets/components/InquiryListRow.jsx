import React, { useState, useRef } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryPinButton from './InquiryPinButton.jsx';
import InquiryCategoryBadge from './InquiryCategoryBadge.jsx';
import PortalMenu from '../../../components/common/PortalMenu.jsx';

const urgencyStyles = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-orange-50 text-orange-700 border-orange-100',
    low: 'bg-pink-50 text-pink-700 border-pink-100'
};

const getUrgencyType = (priority = '') => {
    if (priority.includes('גבוהה')) return 'high';
    if (priority.includes('בינונית')) return 'medium';
    return 'low';
};

const LightBlueIcon = ({ children }) => (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#C9E1FF] bg-[#EAF4FF] text-[#3B82F6] shadow-[0_3px_8px_rgba(59,130,246,0.14)]">
        {children}
    </span>
);

const InquiryUrgencyBadge = ({ priority }) => (
    <span className={`inline-flex h-6 min-w-[82px] items-center justify-center rounded-lg border px-2.5 text-[10px] font-black shadow-sm ${urgencyStyles[getUrgencyType(priority)]}`}>
        {priority}
    </span>
);

const InquiryRowField = ({ icon, value, className = '' }) => (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
        <LightBlueIcon>
            {icon === 'hash' ? <span className="text-xs font-black leading-none">#</span> : <Icon name={icon} className="h-3 w-3" />}
        </LightBlueIcon>
        <span className="truncate text-[12px] font-bold text-slate-700">{value}</span>
    </div>
);

const SelectionCheckbox = ({ ticketId, selected, onToggleSelection }) => (
    <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center" onClick={(event) => event.stopPropagation()}>
        <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelection}
            className="peer sr-only"
            aria-label={`בחר פנייה ${ticketId}`}
        />
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-[#93C5FD] bg-white text-transparent transition peer-focus:ring-2 peer-focus:ring-blue-400/30 peer-checked:border-[#3B82F6] peer-checked:text-[#3B82F6]">
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
    const assignableCategories = categories.filter((item) => !item.system);

    return (
        <div className="w-56 overflow-hidden rounded-2xl border border-[#C9E1FF] bg-white p-1.5 text-right shadow-[0_18px_44px_rgba(37,99,235,0.18)] dark:border-slate-700 dark:bg-slate-800" dir="rtl">
            {onAssignCategory && (
                <>
                    <div className="px-2 py-1.5 text-[11px] font-black text-slate-400">שייך לקטגוריה</div>
                    {assignableCategories.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onAssignCategory(ticket.id, item.id);
                                onClose();
                            }}
                            className="flex min-h-[34px] w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-700 transition hover:bg-[#EAF4FF]"
                        >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        </button>
                    ))}
                    {ticket.categoryId && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onAssignCategory(ticket.id, 'all');
                                onClose();
                            }}
                            className="mt-1 flex min-h-[34px] w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-500 transition hover:bg-slate-50"
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
    onDrop
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const triggerRef = useRef(null);
    const showCloseAction = viewType === 'open' && Boolean(onCloseInquiry);

    // Determine grid template based on active modes
    // Columns: [selection] [manual] [id] [urgency] [room] [name] [phone] [date] [category] [actions]
    const gridCols = [
        selectionMode ? '40px' : '',
        manualMode ? '40px' : '',
        'minmax(100px, 1.2fr)', // ID
        '85px',               // Urgency
        'minmax(110px, 1.2fr)', // Room
        'minmax(110px, 1.5fr)', // Name
        'minmax(110px, 1.2fr)', // Phone
        'minmax(100px, 1.2fr)', // Date
        '160px',              // Category (stable fixed width to prevent shifting)
        '150px'               // Actions cluster (fits 4 buttons + gaps)
    ].filter(Boolean).join(' ');

    return (
        <article
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`group grid min-h-[56px] w-full items-center gap-x-3 gap-y-2 rounded-2xl border px-3 py-2 shadow-[0_6px_18px_rgba(37,99,235,0.10)] transition hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-[#F8FBFF] hover:shadow-[0_12px_26px_rgba(37,99,235,0.14)] ${
                selected
                    ? 'border-[#60A5FA] bg-[#F8FBFF] ring-1 ring-blue-100 shadow-[0_10px_24px_rgba(37,99,235,0.16)]'
                    : 'border-[#C9E1FF] bg-white dark:border-slate-700 dark:bg-slate-800'
            }`}
            style={{ gridTemplateColumns: gridCols }}
        >
            {selectionMode && (
                <div className="flex justify-center">
                    <SelectionCheckbox ticketId={ticket.id} selected={selected} onToggleSelection={onToggleSelection} />
                </div>
            )}

            {manualMode && (
                <div className="flex justify-center">
                    <span className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Icon name="grip" className="h-4 w-4" />
                    </span>
                </div>
            )}

            <InquiryRowField icon="hash" value={ticket.id} className="min-w-0" />
            
            <div className="flex">
                <InquiryUrgencyBadge priority={ticket.priority} />
            </div>

            <InquiryRowField icon="location" value={ticket.room} className="min-w-0" />
            <InquiryRowField icon="user" value={ticket.name} className="min-w-0" />
            <InquiryRowField icon="phone" value={ticket.phone || 'לא זמין'} className="min-w-0" />
            <InquiryRowField icon="calendar" value={ticket.date} className="min-w-0" />

            {/* Category Cell - Keeps fixed space even if empty */}
            <div className="flex min-w-0 items-center">
                {category ? <InquiryCategoryBadge category={category} compact /> : <div className="h-6" aria-hidden="true" />}
            </div>

            {/* Action Cluster - physical left (LTR direction inside RTL layout) */}
            <div className="relative flex shrink-0 items-center justify-end gap-2" dir="ltr">
                <button
                    ref={triggerRef}
                    type="button"
                    title="שיוך לקטגוריה"
                    aria-label={`שיוך פנייה ${ticket.id} לקטגוריה`}
                    aria-expanded={menuOpen}
                    onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpen((value) => !value);
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                        menuOpen
                            ? 'border-[#7DD3FC] bg-[#F0F9FF] text-[#0EA5E9] dark:border-[#0369A1] dark:bg-[#0C4A6E] dark:text-[#38BDF8]'
                            : 'border-[#E2E8F0] bg-white text-[#3B82F6] hover:border-[#93C5FD] hover:bg-[#EAF4FF] dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700'
                    }`}
                >
                    <Icon name="folder" className="h-4 w-4" />
                </button>

                {showCloseAction && (
                    <ActionIconButton
                        title="סגור פנייה"
                        icon="check"
                        onClick={() => onCloseInquiry(ticket)}
                        className="border-[#10B981] bg-[#10B981] text-white hover:bg-[#059669]"
                    />
                )}

                <ActionIconButton
                    title="צפה בפנייה"
                    icon="eye"
                    onClick={() => onView(ticket)}
                    className="border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-blue-900"
                />

                {onTogglePin && <InquiryPinButton pinned={ticket.pinned} loading={loading} onClick={() => onTogglePin(ticket.id)} />}

                <PortalMenu anchorRef={triggerRef} open={menuOpen} onClose={() => setMenuOpen(false)}>
                    <RowMenu ticket={ticket} categories={categories} onAssignCategory={onAssignCategory} onClose={() => setMenuOpen(false)} />
                </PortalMenu>
            </div>
        </article>
    );
};

export { InquiryListRow, InquiryRowField, InquiryUrgencyBadge, LightBlueIcon };
