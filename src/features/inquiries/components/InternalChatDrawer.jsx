import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryDrawerShell from './InquiryDrawerShell.jsx';

const InternalChatDrawer = ({
    open,
    onClose,
    messages,
    draft,
    setDraft,
    onSend
}) => (
    <InquiryDrawerShell
        open={open}
        onClose={onClose}
        title="צ׳אט פנימי ולוג"
        subtitle="גלוי לצוות בלבד"
        icon="chat"
        bodyClassName="flex flex-col"
        footer={(
            <>
                <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="inquiry-input-surface h-20 w-full resize-y rounded-xl px-3 py-2 text-right text-xs font-semibold leading-5 outline-none focus:border-blue-500"
                    placeholder="כתוב הודעה פנימית..."
                />
                <div className="mt-2 flex items-center justify-between">
                    <button type="button" className="inquiry-control flex h-9 w-9 items-center justify-center rounded-xl p-0 text-[var(--color-primary)]">
                        <Icon name="paperclip" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={onSend} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-black text-white">
                        שלח
                        <Icon name="send" className="h-4 w-4 rotate-180" />
                    </button>
                </div>
            </>
        )}
    >
        <div className="m-3 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] px-3 py-2 text-right text-xs font-bold leading-5 text-[var(--color-primary)]">
            הצ׳אט פנימי בלבד ואינו נשלח ללקוח.
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--color-surface-muted)]/70 px-3 py-3">
            {messages.map((message) => (
                <div key={message.id} className="inquiry-panel rounded-2xl p-3 text-right shadow-sm">
                    <div className="flex items-center justify-between text-[11px] font-bold inquiry-muted-text">
                        <span>{message.time}</span>
                        <span className="inquiry-primary-text">{message.author}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 inquiry-secondary-text">{message.text}</p>
                </div>
            ))}
        </div>
    </InquiryDrawerShell>
);

export default InternalChatDrawer;
