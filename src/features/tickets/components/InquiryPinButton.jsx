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
                ? 'border-[#38BDF8] bg-[#38BDF8] text-white hover:bg-[#0EA5E9]'
                : 'border-[#B8D7FF] bg-[#EFF6FF] text-[#3B82F6] hover:border-[#93C5FD] hover:bg-[#EAF4FF]'
        }`}
    >
        <Icon name="pin" className="h-4 w-4" />
    </button>
);

export default InquiryPinButton;
