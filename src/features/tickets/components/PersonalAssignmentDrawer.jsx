import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import InquiryDrawerShell from '../../inquiries/components/InquiryDrawerShell.jsx';
import { usePersonalAssignment } from '../hooks/usePersonalAssignment.js';

const PersonalAssignmentDrawer = ({ open, inquiryId, roomId, roomName, onClose, onSaved }) => {
    const ready = Boolean(inquiryId);
    const {
        filteredUsers,
        selectedUsers,
        draftUserIds,
        loading,
        saving,
        error,
        query,
        setQuery,
        toggleUser,
        removeUser,
        clearSelection,
        resetDraft,
        save,
        hasChanges,
        isEmptyResult,
        hasUsers
    } = usePersonalAssignment({ inquiryId, roomId, open: open && ready });

    const handleClose = () => {
        if (ready) resetDraft();
        onClose();
    };

    const handleSave = async () => {
        if (!ready) return;
        const nextAssignment = await save();
        if (!nextAssignment) return;
        onSaved?.(nextAssignment);
        onClose();
    };

    const footer = ready ? (
        <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={handleClose} className="inquiry-control h-9 rounded-xl px-4 text-xs font-black">ביטול</button>
            <button type="button" onClick={handleSave} disabled={!hasChanges || saving} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'שומר...' : 'שמור שיוך'}
                <Icon name="check" className="h-4 w-4" />
            </button>
        </div>
    ) : (
        <div className="flex justify-end">
            <button type="button" onClick={handleClose} className="inquiry-control h-9 rounded-xl px-4 text-xs font-black">סגור</button>
        </div>
    );

    return (
        <InquiryDrawerShell
            open={open}
            onClose={handleClose}
            title="שיוך משתמשים"
            subtitle={`חדר נוכחי: ${roomName}`}
            icon="users"
            headerMeta={ready && selectedUsers.length ? <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--color-primary)]">{selectedUsers.length} נבחרו</span> : null}
            bodyClassName="flex flex-col bg-[var(--color-surface-muted)]/55"
            footer={footer}
        >
            {!ready ? (
                <div className="flex min-h-[280px] flex-1 items-center justify-center p-5">
                    <div className="w-full max-w-lg rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-6 text-center">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                            <Icon name="users" className="h-6 w-6" />
                        </span>
                        <h3 className="mt-4 text-[17px] font-black text-[var(--color-text-primary)]">שיוך משתמשים לפנייה</h3>
                        <p className="mt-2 text-[13px] font-semibold leading-6 text-[var(--color-text-secondary)]">
                            יש לפרסם את הפנייה תחילה כדי לקבל מספר פנייה ולשמור שיוך משתמשים.
                            לאחר הפרסום הטאב נשאר זמין וניתן לבחור את משתמשי החדר.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex shrink-0 flex-col gap-3 p-3">
                        <label className="relative block">
                            <span className="sr-only">חיפוש משתמש</span>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="חיפוש לפי שם, תפקיד או מזהה"
                                className="inquiry-input-surface h-10 w-full rounded-xl px-10 text-right text-xs font-semibold outline-none focus:border-blue-500"
                            />
                            <Icon name="search" className="absolute right-3 top-3.5 h-4 w-4 inquiry-muted-text" />
                        </label>

                        <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="text-[13px] font-black inquiry-primary-text">משתמשים נבחרים</h3>
                                <button type="button" onClick={clearSelection} disabled={!draftUserIds.length} className="text-[11px] font-black text-red-500 disabled:opacity-40">נקה הכול</button>
                            </div>
                            {selectedUsers.length ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map((user) => (
                                        <span key={user.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] px-3 py-1 text-[11px] font-black text-[var(--color-primary)]">
                                            <button type="button" onClick={() => removeUser(user.id)} className="text-[var(--color-text-muted)] transition hover:text-red-500" aria-label={`הסר את ${user.name}`}>
                                                <Icon name="close" className="h-3 w-3" />
                                            </button>
                                            <span>{user.name}</span>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[12px] font-semibold inquiry-muted-text">לא נבחרו משתמשים.</p>
                            )}
                        </div>
                        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                        <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                <h3 className="text-[13px] font-black inquiry-primary-text">משתמשים זמינים</h3>
                                <span className="text-[11px] font-bold inquiry-muted-text">{filteredUsers.length} תוצאות</span>
                            </div>

                            {loading ? (
                                <div className="inquiry-empty-state rounded-2xl border border-dashed p-6 text-center text-sm font-bold">טוען משתמשים...</div>
                            ) : !hasUsers ? (
                                <div className="inquiry-empty-state rounded-2xl border border-dashed p-6 text-center text-sm font-bold">אין משתמשים זמינים בחדר זה</div>
                            ) : isEmptyResult ? (
                                <div className="inquiry-empty-state rounded-2xl border border-dashed p-6 text-center text-sm font-bold">לא נמצאו משתמשים לחיפוש הנוכחי</div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredUsers.map((user) => {
                                        const selected = draftUserIds.includes(user.id);
                                        return (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => toggleUser(user.id)}
                                                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${selected ? 'inquiry-row-surface inquiry-row-selected border-[var(--color-primary)]' : 'border-transparent inquiry-panel hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]'}`}
                                                aria-pressed={selected}
                                            >
                                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-transparent'}`} aria-hidden="true">
                                                    <Icon name="check" className="h-3.5 w-3.5" />
                                                </span>
                                                <span className="inquiry-icon-chip flex h-10 w-10 items-center justify-center rounded-full">
                                                    <Icon name="user" className="h-5 w-5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-black inquiry-primary-text">{user.name}</span>
                                                    <span className="block text-xs font-bold inquiry-muted-text">{user.role} · {user.personalId}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </InquiryDrawerShell>
    );
};

export default PersonalAssignmentDrawer;
