import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../components/common/Icon.jsx';
import { reopenInquiryService } from '../services/reopenInquiryService.js';

const ticketIdentity = (ticket) => (
    ticket?.ticketId
    || ticket?.ticket?.id
    || ticket?.id
);

const ticketVersion = (ticket) => (
    Number(ticket?.ticketVersion)
    || Number(ticket?.ticket?.version)
    || Number(ticket?.version)
    || 0
);

const ReopenInquiryDialog = ({
    ticket,
    open,
    onClose,
    onReopened
}) => {
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setError('');
        setSubmitting(false);
    }, [open, ticket]);

    if (!open) return null;

    const submit = async () => {
        if (submitting) return;

        setSubmitting(true);
        setError('');

        try {
            const reopenedTicket = await reopenInquiryService.reopenInquiry(
                ticketIdentity(ticket),
                ticketVersion(ticket)
            );

            onReopened?.(reopenedTicket);
            onClose?.();
        } catch (requestError) {
            setError(
                requestError?.message
                || 'לא ניתן להחזיר את הפנייה לפתוחות.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div
            data-tamar-inquiry-layer="reopen"
            className="inquiry-backdrop fixed inset-0 z-[110] flex items-center justify-center p-4"
            dir="rtl"
            onMouseDown={() => {
                if (!submitting) onClose?.();
            }}
        >
            <section
                className="inquiry-overlay-panel w-full max-w-lg overflow-hidden rounded-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reopen-inquiry-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
                    <div>
                        <h3
                            id="reopen-inquiry-title"
                            className="text-base font-black inquiry-primary-text"
                        >
                            החזרת פנייה לפתוחות
                        </h3>
                        <p className="mt-1 text-xs font-bold inquiry-muted-text">
                            {ticket?.displayId
                                || ticket?.ticketNumber
                                || ticketIdentity(ticket)}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="inquiry-control flex h-8 w-8 items-center justify-center rounded-lg p-0 inquiry-muted-text disabled:opacity-50"
                        aria-label="סגור"
                    >
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </header>

                <div className="space-y-4 px-5 py-5">
                    <div className="flex gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                            <Icon name="refresh" className="h-5 w-5" />
                        </span>
                        <div className="text-xs font-bold leading-6">
                            <p className="font-black">
                                הפנייה תחזור לרשימת הפניות הפתוחות.
                            </p>
                            <p>
                                אופן הטיפול, תאריך הסגירה ונתוני הסגירה הנוכחיים יתאפסו.
                            </p>
                            <p>
                                אירוע הסגירה הקודם יישמר בהיסטוריה ויתווסף אירוע פתיחה מחדש.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300"
                        >
                            {error}
                        </div>
                    )}
                </div>

                <footer className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="inquiry-control rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50"
                    >
                        ביטול
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={submitting}
                        data-testid="confirm-reopen-inquiry"
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Icon
                            name="refresh"
                            className={`h-4 w-4 ${
                                submitting ? 'animate-spin' : ''
                            }`}
                        />
                        {submitting
                            ? 'מחזיר לפתוחות…'
                            : 'החזר לפניות פתוחות'}
                    </button>
                </footer>
            </section>
        </div>,
        document.body
    );
};

export default ReopenInquiryDialog;
