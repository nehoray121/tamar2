import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const PublishActions = ({
    isShortcutsOpen,
    setIsShortcutsOpen,
    isPublishConfirmOpen,
    setIsPublishConfirmOpen,
    isClearConfirmOpen,
    setIsClearConfirmOpen,
    onClearContent,
    onPublish
}) => (
    <div className="absolute bottom-5 left-8 z-30">
        <div className="inquiry-overlay-panel relative flex h-14 items-center gap-2 rounded-2xl p-2 backdrop-blur" dir="ltr">
            {isShortcutsOpen && (
                <div className="inquiry-menu-surface absolute bottom-16 left-12 w-64 rounded-2xl p-3 text-right" dir="rtl">
                    <div className="mb-2 text-sm font-black inquiry-primary-text">קיצורי מקלדת</div>
                    <div className="space-y-2 text-xs font-bold inquiry-secondary-text">
                        <div className="flex justify-between"><span>פרסום פנייה</span><kbd className="rounded bg-[var(--color-surface-muted)] px-2 py-0.5">Ctrl Enter</kbd></div>
                        <div className="flex justify-between"><span>שמירה וסגירה</span><kbd className="rounded bg-[var(--color-surface-muted)] px-2 py-0.5">Ctrl S</kbd></div>
                        <div className="flex justify-between"><span>פתיחת תבניות</span><kbd className="rounded bg-[var(--color-surface-muted)] px-2 py-0.5">/</kbd></div>
                    </div>
                </div>
            )}

            {isClearConfirmOpen && (
                <div className="inquiry-menu-surface absolute bottom-16 left-0 w-80 rounded-2xl p-3 text-right" dir="rtl">
                    <div className="text-sm font-black text-red-600 dark:text-red-300">לנקות את תוכן הפנייה?</div>
                    <p className="mt-1 text-xs font-semibold inquiry-secondary-text">כל השדות שמולאו והטיוטה המקומית של החדר הנוכחי יימחקו. טיוטות של חדרים אחרים לא יושפעו.</p>
                    <div className="mt-3 flex justify-start gap-2">
                        <button type="button" onClick={() => setIsClearConfirmOpen(false)} className="inquiry-control h-8 rounded-lg px-3 text-xs font-black">ביטול</button>
                        <button type="button" onClick={onClearContent} className="h-8 rounded-lg bg-red-600 px-4 text-xs font-black text-white shadow-sm shadow-red-200/60 dark:shadow-none">נקה תוכן</button>
                    </div>
                </div>
            )}

            {isPublishConfirmOpen && (
                <div className="inquiry-menu-surface absolute bottom-16 left-24 w-72 rounded-2xl p-3 text-right" dir="rtl">
                    <div className="text-sm font-black inquiry-primary-text">לפרסם ולסגור?</div>
                    <p className="mt-1 text-xs font-semibold inquiry-secondary-text">הפנייה תפורסם והטיוטה המקומית תימחק רק לאחר אישור.</p>
                    <div className="mt-3 flex justify-start gap-2">
                        <button type="button" onClick={() => setIsPublishConfirmOpen(false)} className="inquiry-control h-8 rounded-lg px-3 text-xs font-black">ביטול</button>
                        <button type="button" onClick={onPublish} className="h-8 rounded-lg bg-blue-700 px-4 text-xs font-black text-white">אישור</button>
                    </div>
                </div>
            )}


            <button type="button" onClick={onPublish} className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-blue-700 px-6 text-[13px] font-black leading-none text-white shadow-sm shadow-blue-200" dir="rtl">
                פרסם פנייה
            </button>

            <button type="button" onClick={() => setIsPublishConfirmOpen((value) => !value)} className="inquiry-control inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-4 text-[13px] font-black leading-none inquiry-primary-text shadow-sm" dir="rtl">
                פרסם וסגור
            </button>

            <button type="button" onClick={() => setIsShortcutsOpen((value) => !value)} className="inquiry-control flex h-9 w-9 shrink-0 items-center justify-center rounded-xl p-0 text-[var(--color-primary)]" aria-label="קיצורי מקלדת">
                <Icon name="keyboard" className="h-[18px] w-[18px] shrink-0" />
            </button>
            <button type="button" onClick={() => setIsClearConfirmOpen(true)} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-3 text-[12px] font-black leading-none text-red-600 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/30 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15" dir="rtl">
                <Icon name="trash" className="h-3.5 w-3.5" />
                נקה תוכן
            </button>
        </div>
    </div>
);

export default PublishActions;
