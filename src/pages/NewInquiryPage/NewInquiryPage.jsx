import React from 'react';
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
            <header className="flex h-14 shrink-0 items-end justify-between border-b border-blue-100 bg-white/95 px-6 shadow-[0_2px_14px_rgba(15,23,42,0.05)]">
                <div className="flex h-full items-center gap-4">
                    <h1 className="whitespace-nowrap text-xl font-black tracking-tight text-slate-950">פנייה חדשה – {form.currentRoomName}</h1>
                    <InquiryTabs activeTab={form.activeTab} onFormClick={form.closeChat} onChatClick={form.openChat} onAssignmentClick={form.openAssignment} />
                </div>

                <div className="h-full w-36" aria-hidden="true" />
            </header>

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
