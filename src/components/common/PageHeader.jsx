import React from 'react';

const segmentButtonClass = (active) => [
    'relative flex-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]',
    active
        ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-primary)] shadow-sm'
        : 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50'
].join(' ');

const PageHeader = ({ title, description, toggleState, setToggleState, showToggle = false }) => {
    return (
        <header className="relative z-10 mb-2.5 shrink-0">
            <h1 className="text-slate-900 dark:text-slate-50 mb-1 text-[24px] font-black tracking-tight">{title}</h1>
            {description && <p className="text-slate-600 dark:text-slate-300 text-[13px] font-semibold">{description}</p>}
            {showToggle && (
                <div className="absolute top-0 left-0 flex w-[250px] gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-1 shadow-inner">
                    <button
                        data-testid="external-board-received"
                        type="button"
                        aria-pressed={toggleState === 'received'}
                        onClick={() => setToggleState('received')}
                        className={segmentButtonClass(toggleState === 'received')}
                    >
                        פניות שהתקבלו
                    </button>
                    <button
                        data-testid="external-board-sent"
                        type="button"
                        aria-pressed={toggleState === 'sent'}
                        onClick={() => setToggleState('sent')}
                        className={segmentButtonClass(toggleState === 'sent')}
                    >
                        פניות שנשלחו
                    </button>
                </div>
            )}
        </header>
    );
};

export default PageHeader;
