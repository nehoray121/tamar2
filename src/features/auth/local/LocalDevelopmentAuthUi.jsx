import React, { useEffect, useState } from 'react';

const inputPattern = /^(?:[0-9]{7}|[0-9]{9})$/;

export function LocalDevelopmentLogin({ busy, error, onLogin }) {
    const [value, setValue] = useState('');
    const [validationError, setValidationError] = useState('');

    useEffect(() => () => setValue(''), []);

    const submit = async (event) => {
        event.preventDefault();
        const normalized = value.normalize('NFKC').trim();
        if (!inputPattern.test(normalized)) {
            setValidationError('יש להזין מספר אישי סינתטי בן 7 או 9 ספרות.');
            return;
        }
        setValidationError('');
        const authenticated = await onLogin(normalized);
        if (authenticated) setValue('');
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-5 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-50" dir="rtl">
            <section className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-950/10 dark:border-blue-900/60 dark:bg-slate-900">
                <span className="mb-5 inline-flex rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    סביבת פיתוח מקומית
                </span>
                <h1 className="text-3xl font-black tracking-tight">כניסה מקומית לתמר</h1>
                <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-300">
                    מצב פיתוח מקומי בלבד. הזן מספר אישי של משתמש הקיים ב־tamar_dev.
                </p>
                <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold">מספר אישי</span>
                        <input
                            autoFocus
                            autoComplete="off"
                            inputMode="numeric"
                            maxLength={9}
                            name="local-development-personal-number"
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            disabled={busy}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-left text-lg tracking-[0.18em] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                            aria-describedby={(validationError || error) ? 'local-auth-error' : undefined}
                        />
                    </label>
                    {(validationError || error) && (
                        <p id="local-auth-error" role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">
                            {validationError || error}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={busy}
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:cursor-wait disabled:opacity-60"
                    >
                        {busy ? 'מתבצעת כניסה…' : 'כניסה'}
                    </button>
                </form>
            </section>
        </div>
    );
}

export function LocalSessionResetButton({ onReset }) {
    return (
        <button
            type="button"
            onClick={onReset}
            className="fixed bottom-4 left-4 z-[120] rounded-lg border border-amber-400/40 bg-slate-900/90 px-3 py-2 text-xs font-bold text-amber-200 shadow-lg backdrop-blur transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
            איפוס התחברות מקומית
        </button>
    );
}
