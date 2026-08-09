import React from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import SystemFieldsCard from '../../features/inquiries/components/SystemFieldsCard.jsx';
import RoomFieldsCard from '../../features/inquiries/components/RoomFieldsCard.jsx';
import InquiryTabs from '../../features/inquiries/components/InquiryTabs.jsx';
import InternalChatDrawer from '../../features/inquiries/components/InternalChatDrawer.jsx';
import CustomerHistoryDrawer from '../../features/inquiries/components/CustomerHistoryDrawer.jsx';
import PublishActions from '../../features/inquiries/components/PublishActions.jsx';
import PersonalAssignmentDrawer from '../../features/tickets/components/PersonalAssignmentDrawer.jsx';
import { useInquiryForm } from '../../features/inquiries/hooks/useInquiryForm.js';

const NewInquiryPage = () => {
    const form = useInquiryForm();

    return (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f3f6fb] text-slate-950" dir="rtl">
            <div className="shrink-0 bg-[#f3f6fb] dark:bg-[#0F172A] px-6 pt-5">
                <PageHeader
                    title={`פנייה חדשה - ${form.currentRoomName}`}
                    description="יצירת פנייה חדשה ומילוי פרטי הפנייה בחדר הנוכחי."
                />
                <div className="mt-2 border-b border-blue-100 dark:border-slate-800/60">
                    <InquiryTabs activeTab={form.activeTab} onFormClick={form.closeChat} onChatClick={form.openChat} onAssignmentClick={form.openAssignment} />
                </div>
            </div>

            <main className="flex min-h-0 flex-1 gap-3 overflow-hidden px-5 pb-4 pt-3">
                <SystemFieldsCard
                    inquiryId={form.inquiryId}
                    fields={form.fields}
                    setField={form.setField}
                    templates={form.templates}
                    isTemplateOpen={form.isTemplateOpen}
                    setIsTemplateOpen={form.setIsTemplateOpen}
                    selectTemplate={form.selectTemplate}
                    onOpenHistory={() => form.setIsHistoryOpen(true)}
                />

                <RoomFieldsCard
                    fields={form.fields}
                    setField={form.setField}
                    environments={form.environments}
                    selectedEnvironment={form.selectedEnvironment}
                    selectedSubEnvironment={form.selectedSubEnvironment}
                    environmentId={form.environmentId}
                    setEnvironmentId={form.setEnvironmentId}
                    subEnvironmentId={form.subEnvironmentId}
                    setSubEnvironmentId={form.setSubEnvironmentId}
                    roomId={form.roomId}
                    setRoomId={form.setRoomId}
                    requiredDone={form.requiredDone}
                    requiredTotal={form.requiredTotal}
                    optionalTotal={form.optionalTotal}
                />
            </main>

            <InternalChatDrawer
                open={form.activeTab === 'chat'}
                onClose={form.closeChat}
                messages={form.chatMessages}
                draft={form.chatDraft}
                setDraft={form.setChatDraft}
                onSend={form.sendChatMessage}
            />

            <PersonalAssignmentDrawer
                open={form.activeTab === 'assignment'}
                inquiryId={form.inquiryId}
                roomId={form.roomId}
                roomName={form.currentRoomName}
                onClose={form.closeAssignment}
            />

            <CustomerHistoryDrawer
                open={form.isHistoryOpen}
                onClose={() => form.setIsHistoryOpen(false)}
                inquiries={form.openCustomerInquiries}
            />

            <PublishActions
                isShortcutsOpen={form.isShortcutsOpen}
                setIsShortcutsOpen={form.setIsShortcutsOpen}
                isPublishConfirmOpen={form.isPublishConfirmOpen}
                setIsPublishConfirmOpen={form.setIsPublishConfirmOpen}
            />
        </div>
    );
};

export default NewInquiryPage;
