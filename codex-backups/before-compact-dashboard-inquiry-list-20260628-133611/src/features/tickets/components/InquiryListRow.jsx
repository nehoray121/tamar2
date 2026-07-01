import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

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
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#C9E1FF] bg-[#EAF4FF] text-[#3B82F6] shadow-[0_2px_6px_rgba(59,130,246,0.15)]">
        {children}
    </span>
);

const InquiryUrgencyBadge = ({ priority }) => (
    <span className={`inline-flex h-7 min-w-[84px] items-center justify-center rounded-lg border px-3 text-[11px] font-black shadow-sm ${urgencyStyles[getUrgencyType(priority)]}`}>
        {priority}
    </span>
);

const InquiryRowField = ({ icon, value, className = '' }) => (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        <LightBlueIcon>
            {icon === 'hash' ? <span className="text-sm font-black leading-none">#</span> : <Icon name={icon} className="h-3.5 w-3.5" />}
        </LightBlueIcon>
        <span className="truncate text-[12px] font-bold text-slate-700">{value}</span>
    </div>
);

const InquiryActionButton = ({ title, className, icon, onClick }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition ${className}`}
    >
        <Icon name={icon} className="h-4 w-4" />
    </button>
);

const InquiryListRow = ({ ticket, viewType, toggleState, onView }) => (
    <article className="group flex min-h-[62px] items-center gap-5 rounded-xl border border-[#C9E1FF] bg-white px-4 py-3 shadow-[0_5px_16px_rgba(37,99,235,0.09)] transition hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-[#F8FBFF] hover:shadow-[0_10px_24px_rgba(37,99,235,0.14)]">
        <div className="flex w-[250px] shrink-0 items-center gap-3">
            <InquiryRowField icon="hash" value={ticket.id} className="w-[126px]" />
            <InquiryUrgencyBadge priority={ticket.priority} />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-4 items-center gap-5">
            <InquiryRowField icon="location" value={ticket.room} />
            <InquiryRowField icon="user" value={ticket.name} />
            <InquiryRowField icon="phone" value={ticket.phone} />
            <InquiryRowField icon="calendar" value={ticket.date} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
            {viewType === 'open' && (
                <InquiryActionButton title="סגור פנייה" icon="check" className="border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600" />
            )}

            {viewType === 'external' && toggleState === 'received' && (
                <>
                    <InquiryActionButton title="דחה פנייה" icon="close" className="border-red-500 bg-red-500 text-white hover:bg-red-600" />
                    <InquiryActionButton title="קבל פנייה" icon="check" className="border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600" />
                </>
            )}

            {viewType === 'external' && toggleState === 'sent' && (
                <InquiryActionButton title="בטל פנייה" icon="close" className="border-red-500 bg-red-500 text-white hover:bg-red-600" />
            )}

            <InquiryActionButton title="צפה בפנייה" icon="eye" onClick={() => onView(ticket)} className="border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-blue-900" />
        </div>
    </article>
);

export { InquiryListRow, InquiryRowField, InquiryUrgencyBadge, LightBlueIcon };
