import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryTabs = ({ activeTab, onFormClick, onChatClick }) => (
    <div className="flex h-full items-end gap-1" dir="rtl">
        <button
            type="button"
            onClick={onFormClick}
            className={`flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-t-2xl border px-6 text-sm font-black transition ${activeTab === 'form' ? 'border-blue-100 border-b-white bg-white text-blue-800 shadow-[0_-1px_10px_rgba(37,99,235,0.08)]' : 'border-transparent bg-slate-100 text-blue-300'}`}
        >
            טופס
            <Icon name="filePlus" className="h-4 w-4" />
        </button>

        <button
            type="button"
            onClick={onChatClick}
            className={`flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-t-2xl border px-6 text-sm font-black transition ${activeTab === 'chat' ? 'border-blue-100 border-b-white bg-white text-blue-800 shadow-[0_-1px_10px_rgba(37,99,235,0.08)]' : 'border-transparent bg-slate-100 text-blue-300'}`}
        >
            צ'אט
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                <Icon name="chat" className="h-4 w-4 shrink-0" />
            </span>
        </button>
    </div>
);

export default InquiryTabs;
