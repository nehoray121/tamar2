import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../../../../components/common/Icon.jsx';
import { useTicketMessages } from '../hooks/useTicketMessages.js';
import { isNearConversationBottom, MESSAGE_MAX_LENGTH } from '../domain/ticketMessageModel.js';

const formatMessageTime = (value) => {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('he-IL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const ChatState = ({ icon, title, message, error, onRetry }) => (
    <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center px-6 text-center" role={error ? 'alert' : 'status'} aria-live="polite">
        <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${error ? 'bg-red-500/10 text-red-500' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'}`}>
            {icon === 'loading'
                ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                : <Icon name={icon} className="h-5 w-5" />}
        </span>
        <strong className="text-sm font-black inquiry-primary-text">{title}</strong>
        {message && <p className="mt-2 max-w-xs text-xs font-semibold leading-5 inquiry-muted-text">{message}</p>}
        {onRetry && (
            <button type="button" onClick={onRetry} className="inquiry-control mt-4 rounded-xl px-4 py-2 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40">
                נסה שוב
            </button>
        )}
    </div>
);

const MessageActions = ({ message, onEdit, onDelete, editButtonRef }) => (
    <div className="mt-2 flex items-center gap-1" data-testid={`chat-message-actions-${message.id}`}>
        {message.capabilities.canEdit && (
            <button
                ref={editButtonRef}
                data-testid={`chat-message-edit-${message.id}`}
                type="button"
                onClick={() => onEdit(message)}
                aria-label="עריכת הודעה"
                className="inquiry-control flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
            >
                <Icon name="edit" className="h-3 w-3" />
                עריכה
            </button>
        )}
        {message.capabilities.canDelete && (
            <button
                data-testid={`chat-message-delete-${message.id}`}
                type="button"
                onClick={(event) => onDelete(message, event.currentTarget)}
                aria-label="מחיקת הודעה"
                className="flex h-7 items-center gap-1 rounded-lg border border-red-300/50 bg-red-500/[0.06] px-2 text-[10px] font-black text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 dark:text-red-300"
            >
                <Icon name="trash" className="h-3 w-3" />
                מחיקה
            </button>
        )}
    </div>
);

const TicketChatMessage = ({
    message,
    own,
    editing,
    editDraft,
    editError,
    editPending,
    onBeginEdit,
    onEditDraft,
    onSaveEdit,
    onCancelEdit,
    onDelete
}) => {
    const textareaRef = useRef(null);
    const editButtonRef = useRef(null);

    useEffect(() => {
        if (editing) textareaRef.current?.focus();
    }, [editing]);

    return (
        <article
            data-testid="ticket-chat-message"
            data-message-id={message.id}
            data-message-version={message.messageVersion}
            className={`flex w-full flex-col ${own ? 'items-start' : 'items-end'}`}
        >
            <div className={`max-w-[86%] rounded-2xl border p-3 shadow-sm ${
                message.isDeleted
                    ? 'border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)]'
                    : own
                        ? 'rounded-tr-sm border-blue-400/30 bg-[var(--color-primary-soft)]'
                        : 'inquiry-panel rounded-tl-sm'
            }`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold inquiry-muted-text">
                    <span className="truncate font-black text-[var(--color-primary)]">{message.author.displayName}</span>
                    <time dateTime={message.createdAt || undefined}>{formatMessageTime(message.createdAt)}</time>
                </div>

                {message.isDeleted ? (
                    <p className="flex items-center gap-2 text-xs font-bold italic inquiry-muted-text" data-testid="ticket-chat-tombstone">
                        <Icon name="trash" className="h-3.5 w-3.5" />
                        הודעה זו נמחקה
                    </p>
                ) : editing ? (
                    <form onSubmit={(event) => { event.preventDefault(); onSaveEdit(message); }} className="space-y-2">
                        <label className="sr-only" htmlFor={`chat-edit-${message.id}`}>עריכת תוכן ההודעה</label>
                        <textarea
                            ref={textareaRef}
                            data-testid={`chat-message-edit-input-${message.id}`}
                            id={`chat-edit-${message.id}`}
                            value={editDraft}
                            maxLength={MESSAGE_MAX_LENGTH}
                            onChange={(event) => onEditDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') onCancelEdit();
                                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                    event.preventDefault();
                                    onSaveEdit(message);
                                }
                            }}
                            className="inquiry-input-surface min-h-20 w-full resize-y rounded-xl px-3 py-2 text-xs font-semibold leading-5 outline-none focus:border-blue-500"
                            dir="auto"
                        />
                        {editError && <p role="alert" className="text-[11px] font-bold text-red-500">{editError}</p>}
                        <div className="flex gap-2">
                            <button data-testid={`chat-message-edit-save-${message.id}`} disabled={editPending} type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50">שמור</button>
                            <button disabled={editPending} type="button" onClick={onCancelEdit} className="inquiry-control rounded-lg px-3 py-1.5 text-[11px] font-black">ביטול</button>
                        </div>
                    </form>
                ) : (
                    <p className="whitespace-pre-wrap break-words text-xs font-semibold leading-5 inquiry-primary-text" dir="auto">{message.content}</p>
                )}

                {!message.isDeleted && !editing && (
                    <>
                        {message.isEdited && <span className="mt-1 block text-[10px] font-bold inquiry-muted-text">נערכה</span>}
                        <MessageActions message={message} onEdit={onBeginEdit} onDelete={onDelete} editButtonRef={editButtonRef} />
                    </>
                )}
            </div>
        </article>
    );
};

const DeleteMessageDialog = ({ target, pending, error, onConfirm, onClose }) => {
    const confirmRef = useRef(null);

    useEffect(() => {
        confirmRef.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !pending) onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose, pending]);

    return (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) onClose();
        }}>
            <div role="dialog" aria-modal="true" aria-labelledby="delete-chat-message-title" className="inquiry-overlay-panel w-full max-w-xs rounded-2xl p-4 shadow-2xl">
                <h4 id="delete-chat-message-title" className="text-sm font-black inquiry-primary-text">מחיקת הודעה</h4>
                <p className="mt-2 text-xs font-semibold leading-5 inquiry-secondary-text">
                    תוכן ההודעה יימחק, אך הרשומה תישאר בשיחה לצורך רציפות ובקרה. לא ניתן לבטל פעולה זו.
                </p>
                {error && <p role="alert" className="mt-2 text-[11px] font-bold text-red-500">{error}</p>}
                <div className="mt-4 flex gap-2">
                    <button data-testid="ticket-chat-delete-confirm" ref={confirmRef} disabled={pending} type="button" onClick={() => onConfirm(target.message)} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                        {pending ? 'מוחק...' : 'מחיקת הודעה'}
                    </button>
                    <button disabled={pending} type="button" onClick={onClose} className="inquiry-control rounded-xl px-4 py-2 text-xs font-black">ביטול</button>
                </div>
            </div>
        </div>
    );
};

const TicketChatDrawer = ({ open, ticketId, title = 'צ׳אט הפנייה', currentUser, onClose }) => {
    const chat = useTicketMessages({ ticketId, enabled: open });
    const [draft, setDraft] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showNewIndicator, setShowNewIndicator] = useState(false);
    const listRef = useRef(null);
    const nearBottomRef = useRef(true);
    const initialScrolledRef = useRef(false);
    const ownScrollRef = useRef(false);
    const olderAnchorRef = useRef(null);
    const previousLengthRef = useRef(0);

    const scrollToLatest = (behavior = 'smooth') => {
        const element = listRef.current;
        if (!element) return;
        element.scrollTo({ top: element.scrollHeight, behavior });
        nearBottomRef.current = true;
        setShowNewIndicator(false);
    };

    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !deleteTarget && !editingId) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteTarget, editingId, onClose, open]);

    useEffect(() => {
        setDraft('');
        setEditingId(null);
        setEditDraft('');
        setDeleteTarget(null);
        setShowNewIndicator(false);
        initialScrolledRef.current = false;
        previousLengthRef.current = 0;
    }, [ticketId, open]);

    useEffect(() => {
        if (!editingId) return;
        const current = chat.messages.find((message) => message.id === editingId);
        if (!current || current.isDeleted || !current.capabilities.canEdit) {
            setEditingId(null);
            setEditDraft('');
        }
    }, [chat.messages, editingId]);

    useLayoutEffect(() => {
        const element = listRef.current;
        if (!element || chat.status !== 'ready') return;
        if (olderAnchorRef.current) {
            const anchor = olderAnchorRef.current;
            element.scrollTop = element.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
            olderAnchorRef.current = null;
        } else if (!initialScrolledRef.current || ownScrollRef.current) {
            element.scrollTop = element.scrollHeight;
            initialScrolledRef.current = true;
            ownScrollRef.current = false;
            nearBottomRef.current = true;
        } else if (chat.messages.length > previousLengthRef.current) {
            if (nearBottomRef.current) element.scrollTop = element.scrollHeight;
            else setShowNewIndicator(true);
        }
        previousLengthRef.current = chat.messages.length;
    }, [chat.change.revision, chat.messages.length, chat.status]);

    const handleLoadOlder = async () => {
        const element = listRef.current;
        if (element) olderAnchorRef.current = { scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
        const loaded = await chat.loadOlder();
        if (!loaded) olderAnchorRef.current = null;
    };

    const handleSend = async () => {
        const result = await chat.sendMessage(draft);
        if (!result?.ok) return;
        ownScrollRef.current = true;
        setDraft('');
    };

    const beginEdit = (message) => {
        chat.clearMessageError();
        chat.clearConflict();
        setEditingId(message.id);
        setEditDraft(message.content || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft('');
        chat.clearMessageError();
        chat.clearConflict();
    };

    const saveEdit = async (message) => {
        const result = await chat.updateMessage(message, editDraft);
        if (result?.ok) cancelEdit();
    };

    const closeDeleteDialog = () => {
        const returnFocus = deleteTarget?.returnFocus;
        setDeleteTarget(null);
        chat.clearMessageError();
        window.setTimeout(() => returnFocus?.focus?.(), 0);
    };

    const confirmDelete = async (message) => {
        const result = await chat.deleteMessage(message);
        if (result?.ok || result?.error?.code === 'MESSAGE_ALREADY_DELETED') closeDeleteDialog();
    };

    const mutationError = chat.messageMutation.error?.message || '';
    const deletionPending = chat.messageMutation.type === 'delete' && chat.messageMutation.messageId === deleteTarget?.message?.id;

    return (
        <>
            <div className="inquiry-backdrop absolute inset-0 z-40" onClick={onClose} />
            <aside
                data-testid="ticket-chat-drawer"
                data-ticket-id={ticketId}
                className="inquiry-overlay-panel absolute bottom-0 left-0 top-0 z-50 flex w-[400px] max-w-[46%] flex-col rounded-none border-r shadow-2xl"
                aria-label={title}
                dir="rtl"
            >
                <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                    <div className="min-w-0">
                        <h3 className="flex items-center gap-2 text-sm font-black inquiry-primary-text">
                            <Icon name="chat" className="h-4 w-4 text-[var(--color-primary)]" />
                            {title}
                        </h3>
                        <p className="mt-0.5 truncate text-[10px] font-bold inquiry-muted-text">שיחה רציפה לפנייה {chat.ticketDetails?.ticketNumber || ticketId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {chat.status === 'ready' && (
                            <span data-testid="ticket-chat-realtime-status" data-connected={chat.realtimeConnected ? 'true' : 'false'} className={`h-2 w-2 rounded-full ${chat.realtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} title={chat.realtimeConnected ? 'עדכונים בזמן אמת מחוברים' : 'רענון REST פעיל'} aria-label={chat.realtimeConnected ? 'עדכונים בזמן אמת מחוברים' : 'עדכונים ללא חיבור זמן אמת'} />
                        )}
                        <button data-testid="ticket-chat-close" type="button" onClick={onClose} aria-label="סגירת הצ׳אט" className="inquiry-control flex h-8 w-8 items-center justify-center rounded-lg p-0 inquiry-muted-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40">
                            <Icon name="close" className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                {chat.status === 'loading' && <ChatState icon="loading" title="טוען את שיחת הפנייה" />}
                {chat.status === 'error' && <ChatState icon="alertTriangle" title="לא ניתן לטעון את השיחה" message={chat.error?.message} error onRetry={chat.retry} />}
                {chat.status === 'inaccessible' && <ChatState icon="shield" title="השיחה אינה זמינה" message={chat.error?.message} error />}

                {chat.status === 'ready' && (
                    <>
                        <div className="relative min-h-0 flex-1">
                            <div
                                ref={listRef}
                                data-testid="ticket-chat-messages"
                                className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overflow-x-hidden p-4"
                                aria-live="polite"
                                aria-busy={chat.refreshing || chat.loadingOlder}
                                onScroll={(event) => {
                                    nearBottomRef.current = isNearConversationBottom(event.currentTarget);
                                    if (nearBottomRef.current) setShowNewIndicator(false);
                                }}
                            >
                                {chat.pageInfo.hasMoreBefore && (
                                    <button
                                        data-testid="ticket-chat-load-older"
                                        disabled={chat.loadingOlder}
                                        type="button"
                                        onClick={handleLoadOlder}
                                        className="inquiry-control mx-auto rounded-xl px-4 py-2 text-[11px] font-black disabled:opacity-50"
                                    >
                                        {chat.loadingOlder ? 'טוען הודעות קודמות...' : 'טעינת הודעות קודמות'}
                                    </button>
                                )}
                                {chat.refreshing && <p className="text-center text-[10px] font-bold inquiry-muted-text" role="status">מרענן את השיחה...</p>}
                                {chat.messages.length === 0 ? (
                                    <ChatState icon="chat" title="השיחה עדיין ריקה" message="אפשר לכתוב כאן הודעה לכל המשתתפים בפנייה." />
                                ) : chat.messages.map((message) => (
                                    <TicketChatMessage
                                        key={message.id}
                                        message={message}
                                        own={String(message.author.id) === String(currentUser?.id || '')}
                                        editing={editingId === message.id}
                                        editDraft={editDraft}
                                        editError={editingId === message.id ? mutationError : ''}
                                        editPending={chat.messageMutation.type === 'edit' && chat.messageMutation.messageId === message.id && !chat.messageMutation.error}
                                        onBeginEdit={beginEdit}
                                        onEditDraft={(value) => { setEditDraft(value); chat.clearMessageError(); }}
                                        onSaveEdit={saveEdit}
                                        onCancelEdit={cancelEdit}
                                        onDelete={(nextMessage, returnFocus) => {
                                            chat.clearMessageError();
                                            setDeleteTarget({ message: nextMessage, returnFocus });
                                        }}
                                    />
                                ))}
                                {(chat.conflict || chat.boundedRefreshNotice) && (
                                    <div role="alert" className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-[11px] font-bold leading-5 text-amber-700 dark:text-amber-200">
                                        <p>{chat.conflict?.message || chat.boundedRefreshNotice}</p>
                                        {chat.conflict?.serverContent && (
                                            <p className="mt-1 whitespace-pre-wrap" dir="auto">גרסת השרת: {chat.conflict.serverContent}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            {showNewIndicator && (
                                <button type="button" onClick={() => scrollToLatest()} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-2 text-[11px] font-black text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                                    הודעות חדשות
                                </button>
                            )}
                        </div>

                        <footer className="shrink-0 border-t border-[var(--color-border)] p-3">
                            {chat.canWriteChat ? (
                                <div className="inquiry-soft-panel rounded-xl p-2">
                                    <label htmlFor="ticket-chat-composer" className="sr-only">כתיבת הודעה לשיחת הפנייה</label>
                                    <textarea
                                        id="ticket-chat-composer"
                                        data-testid="ticket-chat-composer"
                                        rows="3"
                                        maxLength={MESSAGE_MAX_LENGTH}
                                        value={draft}
                                        onChange={(event) => { setDraft(event.target.value); chat.clearCreateError(); }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                                event.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="כתיבת הודעה..."
                                        className="inquiry-input-surface w-full resize-none rounded-xl px-3 py-2 text-xs font-semibold leading-5 outline-none focus:border-blue-500"
                                        dir="auto"
                                    />
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold inquiry-muted-text">Ctrl+Enter לשליחה · {draft.length.toLocaleString('he-IL')}/{MESSAGE_MAX_LENGTH.toLocaleString('he-IL')}</span>
                                        <button
                                            data-testid="ticket-chat-send"
                                            disabled={chat.createState.pending}
                                            type="button"
                                            onClick={handleSend}
                                            className="flex h-8 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Icon name="send" className="h-3.5 w-3.5" />
                                            {chat.createState.pending ? 'שולח...' : 'שליחה'}
                                        </button>
                                    </div>
                                    {chat.createState.error && (
                                        <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-500/[0.08] px-2.5 py-2 text-[11px] font-bold text-red-600 dark:text-red-300">
                                            <span>{chat.createState.error.message}</span>
                                            {chat.createState.error.retryable && <button type="button" onClick={handleSend} className="shrink-0 underline">נסה שוב</button>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-center text-[11px] font-bold inquiry-muted-text">
                                    ניתן לצפות בכל השיחה, אך אין הרשאה לכתוב בפנייה זו.
                                </p>
                            )}
                        </footer>
                    </>
                )}

                {deleteTarget && (
                    <DeleteMessageDialog
                        target={deleteTarget}
                        pending={deletionPending}
                        error={deletionPending ? '' : mutationError}
                        onConfirm={confirmDelete}
                        onClose={closeDeleteDialog}
                    />
                )}
            </aside>
        </>
    );
};

export default TicketChatDrawer;