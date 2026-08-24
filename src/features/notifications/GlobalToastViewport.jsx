import React, { useEffect, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { subscribeToNotifications } from './notificationBus.js';

const MAX_TOASTS = 4;

const toneByType = {
    success: {
        shell: 'border-emerald-400/35 bg-emerald-950/95 text-emerald-50 shadow-[0_18px_45px_rgba(5,150,105,0.25)]',
        icon: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/25',
        progress: 'bg-emerald-400'
    },
    error: {
        shell: 'border-red-400/35 bg-red-950/95 text-red-50 shadow-[0_18px_45px_rgba(220,38,38,0.24)]',
        icon: 'bg-red-400/15 text-red-300 ring-red-400/25',
        progress: 'bg-red-400'
    }
};

const ToastCard = ({ toast, onDismiss }) => {
    const tone = toneByType[toast.type] || toneByType.success;

    useEffect(() => {
        const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
        return () => window.clearTimeout(timer);
    }, [onDismiss, toast.duration, toast.id]);

    return (
        <article
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl ${tone.shell}`}
            dir="rtl"
        >
            <div className="flex items-start gap-3 px-4 pb-4 pt-3.5">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${tone.icon}`}>
                    <Icon
                        name={toast.type === 'error' ? 'close' : 'check'}
                        className="h-4 w-4"
                    />
                </span>

                <div className="min-w-0 flex-1 text-right">
                    <div className="text-[13px] font-black leading-5">{toast.title}</div>
                    {toast.message && (
                        <div className="mt-1 text-[12px] font-semibold leading-5 opacity-85">
                            {toast.message}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => onDismiss(toast.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-current opacity-55 transition hover:bg-white/10 hover:opacity-100"
                    aria-label="סגור התראה"
                >
                    <Icon name="close" className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="h-1 w-full bg-white/10">
                <div
                    className={`h-full origin-right ${tone.progress}`}
                    style={{
                        animation: `tamar-toast-progress ${toast.duration}ms linear forwards`
                    }}
                />
            </div>
        </article>
    );
};

const GlobalToastViewport = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => subscribeToNotifications((toast) => {
        setToasts((current) => [...current, toast].slice(-MAX_TOASTS));
    }), []);

    const dismiss = (id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    return (
        <>
            <style>{`
                @keyframes tamar-toast-progress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `}</style>
            <div
                className="pointer-events-none fixed bottom-5 right-5 z-[10000] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2.5"
                aria-label="התראות מערכת"
            >
                {toasts.map((toast) => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </>
    );
};

export default GlobalToastViewport;
