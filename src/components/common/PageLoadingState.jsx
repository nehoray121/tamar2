import React from 'react';

export const PageLoadingState = ({ title = 'טוען נתונים...', description = 'המסך יוצג במלואו כשהנתונים הנדרשים יהיו מוכנים.' }) => (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center p-6" role="status" aria-live="polite" dir="rtl">
        <section className="flex max-w-sm flex-col items-center rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-8 py-7 text-center shadow-[var(--shadow-card)]">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden="true" />
            </span>
            <h2 className="text-base font-black text-[var(--color-text-primary)]">{title}</h2>
            {description && <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">{description}</p>}
        </section>
    </div>
);

export const PageErrorState = ({ title = 'לא הצלחנו לטעון את הנתונים', description = 'בדקו את החיבור ונסו שוב.', retryLabel = 'נסה שוב', onRetry }) => (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center p-6" role="alert" dir="rtl">
        <section className="max-w-md rounded-3xl border border-red-400/30 bg-[var(--color-surface-raised)] px-8 py-7 text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-xl font-black text-red-500">!</span>
            <h2 className="text-base font-black text-[var(--color-text-primary)]">{title}</h2>
            {description && <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">{description}</p>}
            {onRetry && (
                <button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-sm font-black text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
                    {retryLabel}
                </button>
            )}
        </section>
    </div>
);

export default PageLoadingState;
