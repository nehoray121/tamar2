import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InternalChatDrawer = ({
    open,
    onClose,
    messages,
    draft,
    setDraft,
    onSend
}) => (
    <aside
        className={`absolute bottom-4 left-5 top-16 z-40 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-[390px]'}`}
        dir="rtl"
        aria-hidden={!open}
    >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-blue-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <Icon name="chat" className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-base font-black text-slate-950">צ'אט פנימי ולוג</h2>
                    <p className="text-[11px] font-bold text-slate-500">גלוי לצוות בלבד</p>
                </div>
            </div>

            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-slate-500">
                <Icon name="close" className="h-4 w-4" />
            </button>
        </div>

        <div className="m-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-right text-xs font-bold leading-5 text-blue-800">
            הצ'אט פנימי בלבד ואינו נשלח ללקוח.
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-3 py-3">
            {messages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-slate-100 bg-white p-3 text-right shadow-sm">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>{message.time}</span>
                        <span className="text-slate-900">{message.author}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{message.text}</p>
                </div>
            ))}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white p-3">
            <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="h-20 w-full resize-none rounded-xl border border-blue-100 bg-white px-3 py-2 text-right text-xs font-semibold leading-5 text-slate-700 outline-none placeholder:text-blue-200 focus:border-blue-500"
                placeholder="כתוב הודעה פנימית..."
            />
            <div className="mt-2 flex items-center justify-between">
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                    <Icon name="paperclip" className="h-4 w-4" />
                </button>
                <button type="button" onClick={onSend} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-black text-white">
                    שלח
                    <Icon name="send" className="h-4 w-4 rotate-180" />
                </button>
            </div>
        </div>
    </aside>
);

export default InternalChatDrawer;
