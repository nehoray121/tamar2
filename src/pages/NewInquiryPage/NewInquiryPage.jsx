import React from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageLoadingState.jsx';
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

    if (form.initialLoadError) {
        return (
            <div className="inquiry-page-surface relative flex h-full min-h-0 flex-col overflow-hidden" dir="rtl">
                <PageErrorState onRetry={form.reloadInitialData} />
            </div>
        );
    }

    if (form.initialLoading) {
        return (
            <div className="inquiry-page-surface relative flex h-full min-h-0 flex-col overflow-hidden" dir="rtl">
                <PageLoadingState />
            </div>
        );
    }

    const displayTitle = form.currentRoomName ? `פנייה חדשה - ${form.currentRoomName}` : 'פנייה חדשה';

    return (
        <div className="inquiry-page-surface relative flex h-full min-h-0 flex-col overflow-hidden" dir="rtl">
            <div className="inquiry-page-surface shrink-0 px-6 pt-4">
                <PageHeader
                    title={displayTitle}
                    description="יצירת פנייה חדשה ומילוי פרטי הפנייה בחדר הנוכחי."
                />

                <div className="mt-2 border-b border-[var(--color-border-strong)]">
                    <InquiryTabs activeTab={form.activeTab} onFormClick={form.closeChat} onChatClick={form.openChat} onAssignmentClick={form.openAssignment} assignmentEnabled={form.assignmentEnabled}
                        assignmentCount={form.assignedUsers?.length || 0}
                    />
                </div>
            </div>

            <main className="flex min-h-0 flex-1 gap-3 overflow-hidden px-5 pb-4 pt-3 max-md:flex-col">
                <SystemFieldsCard
                    inquiryId={form.inquiryId}
                    fields={form.fields}
                    setField={form.setField}
                    templates={form.templates}
                    isTemplateOpen={form.isTemplateOpen}
                    setIsTemplateOpen={form.setIsTemplateOpen}
                    selectTemplate={form.selectTemplate}
                    incidentDescriptionSettings={form.incidentDescriptionSettings}
                    onOpenHistory={() => form.setIsHistoryOpen(true)}
                    openedBy={form.currentUser?.displayName}
                    historyCount={form.openCustomerInquiries.length}
                />

                <RoomFieldsCard
                    fields={form.fields}
                    dynamicFields={form.dynamicFields}
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
                    assignmentEnabled={form.assignmentEnabled}
                    assignedUsersSummary={form.assignedUsersSummary}
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

            {form.assignmentEnabled && (
                <PersonalAssignmentDrawer
                    open={form.activeTab === 'assignment'}
                    inquiryId={form.ticketId}
                    roomId={form.roomId}
                    roomName={form.currentRoomName}
                    onClose={form.closeAssignment}
                    onSaved={form.refreshAssignment}
                />
            )}

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
                isClearConfirmOpen={form.isClearConfirmOpen}
                setIsClearConfirmOpen={form.setIsClearConfirmOpen}
                onClearContent={form.resetFormContent}
                onPublish={form.publishInquiry}
            />
        </div>
    );
};

export default NewInquiryPage;
