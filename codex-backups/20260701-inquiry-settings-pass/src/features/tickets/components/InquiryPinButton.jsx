import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryPinButton = ({ pinned, loading, onClick }) => (
    <button
        type="button"
        title={pinned ? 'בטל נעיצה' : 'נעץ פנייה'}
        onClick={onClick}
        disabled={loading}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition disabled:opacity-50 ${
            pinned
                ? 'border-cyan-300 bg-cyan-400 text-white hover:bg-cyan-500'
                : 'border-[#C9E1FF] bg-[#EAF4FF] text-[#3B82F6] hover:border-cyan-300 hover:text-cyan-500'
        }`}
    >
        <Icon name="pin" className="h-4 w-4" />
    </button>
);

export default InquiryPinButton;
