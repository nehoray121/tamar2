import React from 'react';
import SystemFieldsCard from '../../features/inquiries/components/SystemFieldsCard.jsx';
import RoomFieldsCard from '../../features/inquiries/components/RoomFieldsCard.jsx';
import InquiryTabs from '../../features/inquiries/components/InquiryTabs.jsx';
import InternalChatDrawer from '../../features/inquiries/components/InternalChatDrawer.jsx';
import PublishActions from '../../features/inquiries/components/PublishActions.jsx';
import { useInquiryForm } from '../../features/inquiries/hooks/useInquiryForm.js';

const InquiryFormContent = () => (
    <div className="flex gap-5 h-full min-h-0 pt-0 pb-0">
        <SystemFieldsCard />
        <RoomFieldsCard />
    </div>
);

const NewInquiryPage = () => {
    const { activeTab, setActiveTab } = useInquiryForm();

    return (
                <div className="p-4 wave-bg h-full flex flex-col min-h-0">
                    
                    {/* Header Top Center - compact 2 rows only */}
                    <div className="text-center mb-1 shrink-0">
                        <h1 className="text-[20px] leading-6 font-black text-brand-text tracking-tight whitespace-nowrap">טופס פנייה חדשה : M-19-1780831307772</h1>
                        <div className="h-5 flex items-center justify-center gap-3 text-[11px] leading-5 font-semibold text-gray-500 whitespace-nowrap">
                            <span className="text-brand-blue font-bold">חדר נוכחי - מנדיי</span>
                            <span className="text-gray-300">|</span>
                            <span>מלא את השדות ליצירת פנייה חדשה, שים לב לשדות חובה <span className="text-red-600 font-bold">(* שדות חובה)</span></span>
                        </div>
                    </div>

                    {/* Central Tabs Area */}
                    <InquiryTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                    {/* Main Content Render */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        {(activeTab === 'form' || activeTab === 'external') && <InquiryFormContent />}
                        
                        {activeTab === 'chat' && <InternalChatDrawer />}
                    </div>

                    {/* Bottom Action Footer */}
                    <PublishActions />
                </div>
    );
};

export default NewInquiryPage;
