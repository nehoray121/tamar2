import React, { useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryDrawerShell = ({
    open,
    onClose,
    title,
    subtitle,
    icon,
    headerMeta,
    children,
    footer,
    widthClass = 'w-[360px] max-w-[min(420px,calc(100vw-2.5rem))]',
    bodyClassName = ''
}) => {
    useEffect(() => {
        if (!open) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, open]);

    return (
        <>
            <div
                className={`inquiry-backdrop absolute inset-0 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={onClose}
                aria-hidden={!open}
            />
            <aside
                className={`inquiry-overlay-panel absolute bottom-4 left-5 top-16 z-50 flex ${widthClass} flex-col overflow-hidden rounded-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] pointer-events-none'}`}
                dir="rtl"
                aria-hidden={!open}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]/50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        {icon && (
                            <span className="inquiry-icon-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
                                <Icon name={icon} className="h-5 w-5" />
                            </span>
                        )}
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-black inquiry-primary-text">{title}</h2>
                            {subtitle && <p className="text-[11px] font-bold inquiry-muted-text">{subtitle}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {headerMeta}
                        <button type="button" onClick={onClose} className="inquiry-control flex h-8 w-8 items-center justify-center rounded-lg p-0 inquiry-muted-text" aria-label="סגור חלונית">
                            <Icon name="close" className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>

                {footer && <div className="shrink-0 border-t border-[var(--color-border)] p-3">{footer}</div>}
            </aside>
        </>
    );
};

export default InquiryDrawerShell;
