import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const PublishActions = ({
    isShortcutsOpen,
    setIsShortcutsOpen,
    isPublishConfirmOpen,
    setIsPublishConfirmOpen
}) => (
    <div className="absolute bottom-5 left-8 z-30">
        <div className="relative flex h-14 items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-[0_18px_36px_rgba(15,23,42,0.12)] ring-1 ring-blue-100 backdrop-blur">
            {isShortcutsOpen && (
                <div className="absolute bottom-16 left-0 w-64 rounded-2xl border border-blue-100 bg-white p-3 text-right shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="mb-2 text-sm font-black text-slate-950">קיצורי מקלדת</div>
                    <div className="space-y-2 text-xs font-bold text-slate-500">
                        <div className="flex justify-between"><span>פרסום פנייה</span><kbd className="rounded bg-slate-100 px-2 py-0.5">Ctrl Enter</kbd></div>
                        <div className="flex justify-between"><span>שמירה וסגירה</span><kbd className="rounded bg-slate-100 px-2 py-0.5">Ctrl S</kbd></div>
                        <div className="flex justify-between"><span>פתיחת תבניות</span><kbd className="rounded bg-slate-100 px-2 py-0.5">/</kbd></div>
                    </div>
                </div>
            )}

            {isPublishConfirmOpen && (
                <div className="absolute bottom-16 left-14 w-72 rounded-2xl border border-blue-100 bg-white p-3 text-right shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="text-sm font-black text-slate-950">לפרסם ולסגור?</div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">הפנייה תפורסם ותוחזר למסך העבודה הקודם.</p>
                    <div className="mt-3 flex justify-start gap-2">
                        <button type="button" onClick={() => setIsPublishConfirmOpen(false)} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600">ביטול</button>
                        <button type="button" onClick={() => setIsPublishConfirmOpen(false)} className="h-8 rounded-lg bg-blue-700 px-4 text-xs font-black text-white">אישור</button>
                    </div>
                </div>
            )}

            <button type="button" onClick={() => setIsShortcutsOpen((value) => !value)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                <Icon name="keyboard" className="h-4.5 w-4.5 shrink-0" />
            </button>

            <button type="button" onClick={() => setIsPublishConfirmOpen((value) => !value)} className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-blue-100 bg-white px-4 text-[13px] font-black leading-none text-slate-900 shadow-sm">
                פרסם וסגור
            </button>

            <button type="button" className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-blue-700 px-6 text-[13px] font-black leading-none text-white shadow-sm shadow-blue-200">
                פרסם פנייה
            </button>
        </div>
    </div>
);

export default PublishActions;
