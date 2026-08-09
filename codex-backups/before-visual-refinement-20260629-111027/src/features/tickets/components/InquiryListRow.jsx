// import React from 'react';
// import Icon from '../../../components/common/Icon.jsx';
// import InquiryPinButton from './InquiryPinButton.jsx';
// import InquiryCategoryBadge from './InquiryCategoryBadge.jsx';

// const urgencyStyles = {
//     high: 'bg-red-50 text-red-700 border-red-100',
//     medium: 'bg-orange-50 text-orange-700 border-orange-100',
//     low: 'bg-pink-50 text-pink-700 border-pink-100'
// };

// const getUrgencyType = (priority = '') => {
//     if (priority.includes('גבוהה')) return 'high';
//     if (priority.includes('בינונית')) return 'medium';
//     return 'low';
// };

// const LightBlueIcon = ({ children }) => (
//     <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#C9E1FF] bg-[#EAF4FF] text-[#3B82F6] shadow-[0_2px_6px_rgba(59,130,246,0.15)]">
//         {children}
//     </span>
// );

// const InquiryUrgencyBadge = ({ priority }) => (
//     <span className={`inline-flex h-6 min-w-[76px] items-center justify-center rounded-lg border px-2 text-[10px] font-black shadow-sm ${urgencyStyles[getUrgencyType(priority)]}`}>
//         {priority}
//     </span>
// );

// const InquiryRowField = ({ icon, value, className = '' }) => (
//     <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
//         <LightBlueIcon>
//             {icon === 'hash' ? <span className="text-xs font-black leading-none">#</span> : <Icon name={icon} className="h-3 w-3" />}
//         </LightBlueIcon>
//         <span className="truncate text-[11px] font-bold text-slate-700">{value}</span>
//     </div>
// );

// const InquiryActionButton = ({ title, className, icon, onClick }) => (
//     <button
//         type="button"
//         title={title}
//         onClick={onClick}
//         className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition ${className}`}
//     >
//         <Icon name={icon} className="h-4 w-4" />
//     </button>
// );

// const InquiryListRow = ({
//     ticket,
//     viewType,
//     toggleState,
//     onView,
//     categories = [],
//     category,
//     onTogglePin,
//     onAssignCategory,
//     onCloseInquiry,
//     loading,
//     selectionMode,
//     selected,
//     onToggleSelection,
//     manualMode,
//     draggable,
//     onDragStart,
//     onDragOver,
//     onDrop
// }) => (
//     <article
//         draggable={draggable}
//         onDragStart={onDragStart}
//         onDragOver={onDragOver}
//         onDrop={onDrop}
//         className="group flex min-h-[58px] w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#C9E1FF] bg-white px-3 py-2.5 shadow-[0_5px_16px_rgba(37,99,235,0.09)] transition hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-[#F8FBFF] hover:shadow-[0_10px_24px_rgba(37,99,235,0.14)]"
//     >
//         {selectionMode && (
//             <input type="checkbox" checked={selected} onChange={onToggleSelection} className="h-4 w-4 shrink-0 accent-blue-600" />
//         )}
//         {manualMode && (
//             <span className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg bg-slate-100 text-slate-400">
//                 <Icon name="grip" className="h-4 w-4" />
//             </span>
//         )}

//         <div className="flex min-w-[188px] flex-[0_1_238px] items-center gap-2">
//             <InquiryRowField icon="hash" value={ticket.id} className="min-w-0 flex-1" />
//             <InquiryUrgencyBadge priority={ticket.priority} />
//         </div>

//         <div className="grid min-w-[320px] flex-[1_1_520px] grid-cols-2 items-center gap-x-4 gap-y-2 lg:grid-cols-5">
//             <InquiryRowField icon="location" value={ticket.room} />
//             <InquiryRowField icon="user" value={ticket.name} />
//             <InquiryRowField icon="phone" value={ticket.phone} />
//             <InquiryRowField icon="calendar" value={ticket.date} />
//             <InquiryCategoryBadge category={category} />
//         </div>

//         <div className="ms-auto flex shrink-0 items-center gap-2">
//             {onTogglePin && <InquiryPinButton pinned={ticket.pinned} loading={loading} onClick={() => onTogglePin(ticket.id)} />}
//             {onAssignCategory && (
//                 <select
//                     value={ticket.categoryId || 'all'}
//                     onChange={(event) => onAssignCategory(ticket.id, event.target.value)}
//                     className="h-8 max-w-[140px] rounded-lg border border-[#C9E1FF] bg-white px-2 text-[11px] font-black text-slate-600"
//                     title="שיוך קטגוריה"
//                 >
//                     {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
//                 </select>
//             )}
//             {viewType === 'open' && (
//                 <InquiryActionButton title="סגור פנייה" icon="check" onClick={() => onCloseInquiry?.(ticket)} className="border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600" />
//             )}

//             {viewType === 'external' && toggleState === 'received' && (
//                 <>
//                     <InquiryActionButton title="דחה פנייה" icon="close" className="border-red-500 bg-red-500 text-white hover:bg-red-600" />
//                     <InquiryActionButton title="קבל פנייה" icon="check" className="border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600" />
//                 </>
//             )}

//             {viewType === 'external' && toggleState === 'sent' && (
//                 <InquiryActionButton title="בטל פנייה" icon="close" className="border-red-500 bg-red-500 text-white hover:bg-red-600" />
//             )}

//             <InquiryActionButton title="צפה בפנייה" icon="eye" onClick={() => onView(ticket)} className="border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-blue-900" />
//         </div>
//     </article>
// );

// export { InquiryListRow, InquiryRowField, InquiryUrgencyBadge, LightBlueIcon };



import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryPinButton from './InquiryPinButton.jsx';
import InquiryCategoryBadge from './InquiryCategoryBadge.jsx';

const urgencyStyles = {
    high: `
        border-red-100 bg-red-50 text-red-700
        dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300
    `,
    medium: `
        border-orange-100 bg-orange-50 text-orange-700
        dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300
    `,
    low: `
        border-pink-100 bg-pink-50 text-pink-700
        dark:border-pink-500/30 dark:bg-pink-500/15 dark:text-pink-300
    `
};

const actionButtonStyles = {
    view: `
        border-[#1E3A8A] bg-[#1E3A8A] text-white
        hover:border-[#1E40AF] hover:bg-[#1E40AF]
        active:border-[#172554] active:bg-[#172554]

        dark:border-blue-500/40 dark:bg-blue-900 dark:text-blue-100
        dark:hover:border-blue-400/50 dark:hover:bg-blue-800
        dark:active:bg-blue-950
    `,

    approve: `
        border-emerald-500 bg-emerald-500 text-white
        hover:border-emerald-600 hover:bg-emerald-600
        active:border-emerald-700 active:bg-emerald-700

        dark:border-emerald-500 dark:bg-emerald-600
        dark:hover:border-emerald-400 dark:hover:bg-emerald-500
        dark:active:bg-emerald-700
    `,

    reject: `
        border-red-500 bg-red-500 text-white
        hover:border-red-600 hover:bg-red-600
        active:border-red-700 active:bg-red-700

        dark:border-red-500 dark:bg-red-600
        dark:hover:border-red-400 dark:hover:bg-red-500
        dark:active:bg-red-700
    `
};

const getUrgencyType = (priority = '') => {
    if (priority.includes('גבוהה')) return 'high';
    if (priority.includes('בינונית')) return 'medium';

    return 'low';
};

const LightBlueIcon = ({ children }) => (
    <span
        className="
            flex h-6 w-6 shrink-0 items-center justify-center
            rounded-md border border-[#C9E1FF]
            bg-[#EAF4FF] text-[#3B82F6]
            shadow-[0_2px_6px_rgba(59,130,246,0.15)]

            dark:border-blue-400/25
            dark:bg-blue-500/10
            dark:text-blue-300
            dark:shadow-none
        "
    >
        {children}
    </span>
);

const InquiryUrgencyBadge = ({ priority }) => (
    <span
        className={`
            inline-flex h-6 min-w-[76px] items-center justify-center
            rounded-lg border px-2
            text-[10px] font-black shadow-sm
            ${urgencyStyles[getUrgencyType(priority)]}
        `}
    >
        {priority}
    </span>
);

const InquiryRowField = ({ icon, value, className = '' }) => (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
        <LightBlueIcon>
            {icon === 'hash' ? (
                <span className="text-xs font-black leading-none">#</span>
            ) : (
                <Icon name={icon} className="h-3 w-3" />
            )}
        </LightBlueIcon>

        <span
            className="
                truncate text-[11px] font-bold
                text-slate-700
                dark:text-slate-200
            "
        >
            {value || 'לא זמין'}
        </span>
    </div>
);

const InquiryActionButton = ({
    title,
    className = '',
    icon,
    onClick,
    disabled = false
}) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        className={`
            flex h-8 w-8 shrink-0 items-center justify-center
            rounded-lg border shadow-sm
            transition-colors duration-150

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-400
            focus-visible:ring-offset-2
            focus-visible:ring-offset-white

            disabled:cursor-not-allowed
            disabled:opacity-50

            dark:focus-visible:ring-blue-400
            dark:focus-visible:ring-offset-slate-950

            ${className}
        `}
    >
        <Icon name={icon} className="h-4 w-4" />
    </button>
);

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
}) => (
    <article
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="
            group flex min-h-[58px] w-full min-w-0
            flex-wrap items-center
            gap-x-4 gap-y-2
            rounded-xl border border-[#C9E1FF]
            bg-white px-3 py-2.5
            shadow-[0_5px_16px_rgba(37,99,235,0.09)]
            transition-colors duration-150

            hover:border-[#93C5FD]
            hover:bg-[#F8FBFF]

            dark:border-slate-700
            dark:bg-slate-900
            dark:shadow-[0_5px_16px_rgba(0,0,0,0.22)]
            dark:hover:border-blue-500/50
            dark:hover:bg-slate-800
        "
    >
        {selectionMode && (
            <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelection}
                aria-label={`בחר פנייה ${ticket.id}`}
                className="
                    h-4 w-4 shrink-0
                    cursor-pointer accent-blue-600
                "
            />
        )}

        {manualMode && (
            <span
                className="
                    flex h-8 w-8 shrink-0 cursor-grab
                    items-center justify-center
                    rounded-lg bg-slate-100 text-slate-400

                    active:cursor-grabbing

                    dark:bg-slate-800
                    dark:text-slate-400
                "
            >
                <Icon name="grip" className="h-4 w-4" />
            </span>
        )}

        <div className="flex min-w-[188px] flex-[0_1_238px] items-center gap-2">
            <InquiryRowField
                icon="hash"
                value={ticket.id}
                className="min-w-0 flex-1"
            />

            <InquiryUrgencyBadge priority={ticket.priority} />
        </div>

        <div
            className="
                grid min-w-[320px] flex-[1_1_520px]
                grid-cols-2 items-center
                gap-x-4 gap-y-2
                lg:grid-cols-5
            "
        >
            <InquiryRowField icon="location" value={ticket.room} />
            <InquiryRowField icon="user" value={ticket.name} />
            <InquiryRowField icon="phone" value={ticket.phone} />
            <InquiryRowField icon="calendar" value={ticket.date} />

            <InquiryCategoryBadge category={category} />
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-2">
            {onTogglePin && (
                <InquiryPinButton
                    pinned={ticket.pinned}
                    loading={loading}
                    onClick={() => onTogglePin(ticket.id)}
                />
            )}

            {onAssignCategory && (
                <select
                    value={ticket.categoryId || 'all'}
                    onChange={(event) =>
                        onAssignCategory(ticket.id, event.target.value)
                    }
                    disabled={loading}
                    title="שיוך קטגוריה"
                    aria-label={`שיוך פנייה ${ticket.id} לקטגוריה`}
                    className="
                        h-8 max-w-[140px]
                        rounded-lg border
                        border-violet-200
                        bg-violet-50 px-2
                        text-[11px] font-black
                        text-violet-700
                        transition-colors duration-150

                        hover:border-violet-300
                        hover:bg-violet-100

                        focus:outline-none
                        focus:ring-2
                        focus:ring-violet-300

                        disabled:cursor-not-allowed
                        disabled:opacity-50

                        dark:border-violet-400/30
                        dark:bg-violet-500/15
                        dark:text-violet-200
                        dark:hover:border-violet-400/50
                        dark:hover:bg-violet-500/25
                        dark:focus:ring-violet-500/40
                    "
                >
                    {categories.map((item) => (
                        <option
                            key={item.id}
                            value={item.id}
                            className="
                                bg-white text-slate-800
                                dark:bg-slate-900 dark:text-slate-100
                            "
                        >
                            {item.name}
                        </option>
                    ))}
                </select>
            )}

            {viewType === 'open' && (
                <InquiryActionButton
                    title="סגור פנייה"
                    icon="check"
                    disabled={loading}
                    onClick={() => onCloseInquiry?.(ticket)}
                    className={actionButtonStyles.approve}
                />
            )}

            {viewType === 'external' && toggleState === 'received' && (
                <>
                    <InquiryActionButton
                        title="דחה פנייה"
                        icon="close"
                        disabled={loading}
                        className={actionButtonStyles.reject}
                    />

                    <InquiryActionButton
                        title="קבל פנייה"
                        icon="check"
                        disabled={loading}
                        className={actionButtonStyles.approve}
                    />
                </>
            )}

            {viewType === 'external' && toggleState === 'sent' && (
                <InquiryActionButton
                    title="בטל פנייה"
                    icon="close"
                    disabled={loading}
                    className={actionButtonStyles.reject}
                />
            )}

            <InquiryActionButton
                title="צפה בפנייה"
                icon="eye"
                disabled={loading}
                onClick={() => onView(ticket)}
                className={actionButtonStyles.view}
            />
        </div>
    </article>
);

export {
    InquiryListRow,
    InquiryRowField,
    InquiryUrgencyBadge,
    LightBlueIcon
};