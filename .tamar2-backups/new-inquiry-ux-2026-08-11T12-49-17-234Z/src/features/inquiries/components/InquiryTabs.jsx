import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryTabs = ({ activeTab, onFormClick, onChatClick, onAssignmentClick, assignmentEnabled = true }) => (
    <div className="flex h-full items-end gap-1" dir="rtl">
        <button
            type="button"
            onClick={onFormClick}
            className={`flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-t-2xl border px-6 text-sm font-black transition ${activeTab === 'form' ? 'inquiry-tab-button inquiry-tab-button--active' : 'inquiry-tab-button inquiry-tab-button--inactive'}`}
        >
            טופס
            <Icon name="filePlus" className="h-4 w-4" />
        </button>

        <button
            type="button"
            onClick={onChatClick}
            className={`flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-t-2xl border px-6 text-sm font-black transition ${activeTab === 'chat' ? 'inquiry-tab-button inquiry-tab-button--active' : 'inquiry-tab-button inquiry-tab-button--inactive'}`}
        >
            צ׳אט
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                <Icon name="chat" className="h-4 w-4 shrink-0" />
            </span>
        </button>

        {assignmentEnabled && (
            <button
                type="button"
                onClick={onAssignmentClick}
                className={`flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-t-2xl border px-6 text-sm font-black transition ${activeTab === 'assignment' ? 'inquiry-tab-button inquiry-tab-button--active' : 'inquiry-tab-button inquiry-tab-button--inactive'}`}
            >
                שיוך משתמשים
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <Icon name="users" className="h-4 w-4 shrink-0" />
                </span>
            </button>
        )}
    </div>
);

export default InquiryTabs;