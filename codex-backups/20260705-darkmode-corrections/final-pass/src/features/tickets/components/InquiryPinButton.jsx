import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryPinButton = ({ pinned, loading, onClick }) => (
    <button
        type="button"
        title={pinned ? 'בטל נעיצה' : 'נעץ פנייה'}
        aria-label={pinned ? 'בטל נעיצת פנייה' : 'נעץ פנייה לראש הרשימה'}
        onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
        }}
        disabled={loading}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-50 ${
            pinned
                ? 'border-[#7DD3FC] bg-[#F0F9FF] text-[#0EA5E9] hover:bg-[#E0F2FE] dark:border-[#0369A1] dark:bg-[#0C4A6E] dark:text-[#38BDF8]'
                : 'border-[#E2E8F0] bg-white text-[#94A3B8] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
        }`}
    >
        <Icon name="pin" className="h-4 w-4" />
    </button>
);

export default InquiryPinButton;
