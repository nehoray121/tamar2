import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { Button } from '../../components/ui/index.js';

const EnvironmentSelectionModal = ({
    environments = [],
    rooms = [],
    loading = false,
    error = '',
    onRetry,
    onConfirm,
    onClose
}) => {
    const [selectedId, setSelectedId] = useState(null);
    const [query, setQuery] = useState('');

    const visibleEnvironments = useMemo(() => environments
        .filter((environment) => environment.name.includes(query.trim()))
        .map((environment) => ({
            ...environment,
            roomCount: rooms.filter((room) => room.environmentId === environment.id).length
        })), [environments, query, rooms]);
    const selectedEnvironment = environments.find((environment) => environment.id === selectedId) || null;

    useEffect(() => {
        if (selectedId && !selectedEnvironment) setSelectedId(null);
    }, [selectedEnvironment, selectedId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 glass-modal animate-fade-in" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="environment-selection-title">
            <div className="flex max-h-[82vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] shadow-2xl">
                <header className="relative shrink-0 px-5 pb-3 pt-5 text-center">
                    <button onClick={onClose} className="inquiry-control absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full p-0 inquiry-muted-text" aria-label="סגור">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                    <div className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <Icon name="globe" className="h-4 w-4" />
                    </div>
                    <h2 id="environment-selection-title" className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)]">בחירת סביבה</h2>
                    <p className="mt-1 text-[12px] font-bold text-[var(--color-text-muted)]">
                        {loading ? 'טוענים את המבנה הארגוני...' : `${environments.length} סביבות פעילות זמינות לפי ההרשאות שלך`}
                    </p>

                    {!error && !loading && (
                        <div className="relative mx-auto mt-4 w-full max-w-xl">
                            <input value={query} onChange={(event) => setQuery(event.target.value)} className="inquiry-input-surface h-9 w-full rounded-xl px-4 pl-10 text-[13px] font-semibold outline-none focus:border-[var(--color-primary)]" placeholder="חיפוש סביבה לפי שם..." autoFocus />
                            <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-primary)]" />
                        </div>
                    )}
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-muted)]/55 p-4">
                    {loading ? (
                        <div data-testid="organization-context-loading" className="flex min-h-[250px] items-center justify-center" role="status" aria-live="polite">
                            <div className="flex flex-col items-center gap-3 text-[var(--color-text-secondary)]">
                                <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden="true" />
                                <span className="text-sm font-black">מאמתים התחברות וטוענים סביבות פעילות</span>
                            </div>
                        </div>
                    ) : error ? (
                        <section data-testid="organization-context-error" role="alert" className="mx-auto flex min-h-[250px] max-w-lg flex-col items-center justify-center rounded-2xl border border-red-400/30 bg-[var(--color-surface-raised)] p-6 text-center">
                            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 font-black text-red-500">!</span>
                            <h3 className="text-base font-black text-[var(--color-text-primary)]">לא ניתן לטעון את המבנה הארגוני</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">{error}</p>
                            {onRetry && <Button data-testid="organization-context-retry" onClick={onRetry} className="mt-5 h-9 rounded-lg px-5 py-0 text-xs">בדיקה מחדש</Button>}
                        </section>
                    ) : visibleEnvironments.length ? (
                        <div className="mx-auto grid max-w-[860px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {visibleEnvironments.map((environment) => (
                                <button
                                    data-testid="organization-environment-option"
                                    data-environment-id={environment.id}
                                    key={environment.id}
                                    type="button"
                                    onClick={() => setSelectedId(environment.id)}
                                    onDoubleClick={() => onConfirm(environment)}
                                    className={`relative flex min-h-[98px] cursor-pointer flex-col justify-between rounded-xl border p-3 text-right shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                                        selectedId === environment.id
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]'
                                            : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                            <Icon name="building" className="h-[18px] w-[18px]" />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[15px] font-black">{environment.name}</span>
                                    </div>
                                    <div className="mt-3 text-[11px] font-bold text-[var(--color-text-muted)]">{environment.roomCount} חדרים פעילים</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div data-testid="organization-context-empty" className="flex min-h-[250px] items-center justify-center text-center">
                            <div>
                                <Icon name="building" className="mx-auto h-9 w-9 text-[var(--color-text-muted)]" />
                                <h3 className="mt-3 text-sm font-black text-[var(--color-text-primary)]">לא נמצאו סביבות פעילות</h3>
                                <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">אין סביבות עם חדרים פעילים בתחום ההרשאה הנוכחי.</p>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-3">
                    <div className="min-w-0 text-[12px] font-bold text-[var(--color-text-muted)]">
                        {selectedEnvironment ? <>נבחרה: <span className="text-[var(--color-text-primary)]">{selectedEnvironment.name}</span></> : 'בחרו סביבה כדי להמשיך'}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="h-9 rounded-lg px-5 py-0 text-[12px] font-bold">ביטול</Button>
                        <Button data-testid="organization-environment-confirm" onClick={() => selectedEnvironment && onConfirm(selectedEnvironment)} className={`h-9 rounded-lg px-7 py-0 text-[12px] font-bold ${!selectedEnvironment ? 'cursor-not-allowed opacity-50' : ''}`} disabled={!selectedEnvironment || loading || Boolean(error)}>
                            <Icon name="check" className="h-4 w-4" /> אשר מעבר
                        </Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default EnvironmentSelectionModal;
