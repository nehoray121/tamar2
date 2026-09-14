import React, { useEffect, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { InquiryUrgencyBadge, LightBlueIcon } from '../../features/tickets/components/InquiryListRow.jsx';
import { getTicketCapabilities, getTicketModalTabs } from '../../features/tickets/config/ticketCapabilities.js';
import { mapTicketToDestinationFields } from '../../features/tickets/utils/mapTicketToDestinationFields.js';
import TicketChatDrawer from '../../features/tickets/chat/components/TicketChatDrawer.jsx';
import { useSessionStore } from '../../store/session.store.js';
import { ticketsApi } from '../../features/tickets/api/ticketsApi.js';
import { subscribeBoardRealtime } from '../../features/tickets/boards/realtime/boardSocket.js';
import { useRoomSettings } from '../../features/settings/hooks/useRoomSettings.js';
import { createDefaultSections, defaultInquiryFields } from '../../features/settings/constants/settingsDefaults.js';
import InquiryFormCanvas from '../../features/inquiries/layout/InquiryFormCanvas.jsx';

const destinationFieldDefinitions = [
    { key: 'destinationHandler', type: 'text', aliases: ['handler'] },
    { key: 'urgency', type: 'select', sourceKey: 'priority' },
    { key: 'contactPhone', type: 'text', aliases: ['phone'] },
    { key: 'customerId', type: 'text', aliases: ['customerId'] },
    { key: 'description', type: 'textarea', aliases: ['description'] }
];

const InfoCard = ({ icon, label, value, editing = false, onChange }) => (
    <div className="inquiry-panel flex min-h-[68px] items-center gap-3 rounded-xl p-3 shadow-[0_2px_8px_rgba(30,64,175,0.05)]">
        <LightBlueIcon>
            <Icon name={icon} className="h-3.5 w-3.5" />
        </LightBlueIcon>
        <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-bold inquiry-muted-text">{label}</div>
            {editing ? (
                <input value={value || ''} onChange={(event) => onChange?.(event.target.value)} className="inquiry-input-surface h-8 w-full rounded-lg px-2 text-[12px] font-black outline-none focus:border-blue-500" />
            ) : (
                <div className="truncate text-[13px] font-black inquiry-primary-text">{value || '-'}</div>
            )}
        </div>
    </div>
);

const ModalActionButton = ({ children, icon, onClick, tone = 'default' }) => {
    const tones = {
        default: 'inquiry-control inquiry-secondary-text',
        primary: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
        success: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300'
    };

    return (
        <button type="button" onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-[12px] font-black shadow-sm transition ${tones[tone]}`}>
            {icon && (
                <span className={`flex h-5 w-5 items-center justify-center rounded-md ${tone === 'primary' ? 'bg-white/15' : 'inquiry-icon-chip'}`}>
                    <Icon name={icon} className="h-3.5 w-3.5" />
                </span>
            )}
            {children}
        </button>
    );
};

const SendInquiryView = ({ ticket, onTransferred }) => {
    const mappedFields = mapTicketToDestinationFields(ticket, destinationFieldDefinitions);
    const [targets, setTargets] = useState([]);
    const [destinationRoomId, setDestinationRoomId] = useState('');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        setStatus('loading');
        ticketsApi.getTransferTargets(ticket.ticketId, { page: 1, limit: 100 }, { signal: controller.signal })
            .then((response) => {
                const items = response.data?.items || [];
                setTargets(items);
                setDestinationRoomId(items[0]?.id || '');
                setStatus('ready');
            })
            .catch((loadError) => {
                if (loadError?.name === 'AbortError') return;
                setError(loadError?.message || 'לא ניתן לטעון חדרי יעד.');
                setStatus('error');
            });
        return () => controller.abort();
    }, [ticket.ticketId]);

    const submitTransfer = async () => {
        if (!destinationRoomId || reason.trim().length < 3) {
            setError('יש לבחור חדר יעד ולהזין סיבת העברה באורך של שלושה תווים לפחות.');
            return;
        }
        setStatus('saving');
        setError('');
        try {
            const response = await ticketsApi.initiateTransfer(ticket.ticketId, {
                destinationRoomId,
                reason: reason.trim()
            }, ticket.ticketVersion);
            onTransferred?.(response.data);
        } catch (transferError) {
            setError(transferError?.message || 'לא ניתן להעביר את הפנייה.');
            setStatus('error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="inquiry-panel grid gap-3 rounded-xl p-4 shadow-sm md:grid-cols-2">
                <label className="text-[12px] font-black inquiry-secondary-text">
                    חדר יעד *
                    <select value={destinationRoomId} onChange={(event) => setDestinationRoomId(event.target.value)} disabled={status === 'loading'} className="inquiry-input-surface mt-1 h-9 w-full rounded-lg px-3 text-[12px] font-bold outline-none">
                        {!targets.length && <option value="">אין חדרי יעד זמינים</option>}
                        {targets.map((target) => <option key={target.id} value={target.id}>{target.environment.name} / {target.subEnvironment.name} / {target.name}</option>)}
                    </select>
                </label>
                <label className="text-[12px] font-black inquiry-secondary-text">
                    סיבת העברה *
                    <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={5000} className="inquiry-input-surface mt-1 h-9 w-full rounded-lg px-3 text-[12px] font-bold outline-none" placeholder="הסיבה להעברת הפנייה" />
                </label>
            </div>

            <div className="inquiry-panel grid gap-3 rounded-xl p-4 shadow-sm md:grid-cols-2">
                <InfoCard icon="users" label="גורם מטפל" value={mappedFields.destinationHandler.value} />
                <InfoCard icon="target" label="דחיפות" value={mappedFields.urgency.value} />
                <InfoCard icon="phone" label="טלפון ליצירת קשר" value={mappedFields.contactPhone.value} />
                <InfoCard icon="search" label="מזהה לקוח" value={mappedFields.customerId.value} />
                <div className="inquiry-soft-panel col-span-full rounded-xl p-3">
                    <div className="mb-1 text-[11px] font-bold inquiry-muted-text">תיאור הפנייה המקורית</div>
                    <p className="text-[12px] font-bold inquiry-primary-text">{mappedFields.description.value || 'לא הוזן תיאור'}</p>
                </div>
            </div>

            {error && <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300">{error}</div>}
            <div className="flex justify-center border-t border-[var(--color-border)] pt-3">
                <ModalActionButton icon="send" tone="primary" onClick={submitTransfer}>{status === 'saving' ? 'שולח…' : 'שליחת הפנייה'}</ModalActionButton>
            </div>
        </div>
    );
};

const formatDateTime = (value) => value
    ? new Date(value).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
    : 'לא זמין';

const TicketModal = ({ ticket, viewType, onClose, onCloseInquiry, onTransferred, onUpdated }) => {
    const [detail, setDetail] = useState(null);
    const [detailStatus, setDetailStatus] = useState('loading');
    const [detailError, setDetailError] = useState('');
    const [activeTab, setActiveTab] = useState('info');
    const [isEditing, setIsEditing] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [editDraft, setEditDraft] = useState(null);
const [historyState, setHistoryState] = useState({
    status: 'idle',
    items: [],
    error: ''
});
const [workflowStatus, setWorkflowStatus] = useState('idle');
const currentUser = useSessionStore((state) => state.currentUser);

    const { settings: layoutSettings } = useRoomSettings();
    const canonicalTicketId = ticket.ticketId || ticket.ticket?.id || (viewType !== 'external' ? ticket.id : null);

    useEffect(() => {
        if (!canonicalTicketId) return undefined;
        const controller = new AbortController();
        setDetailStatus('loading');
        setDetailError('');
        ticketsApi.get(canonicalTicketId, { signal: controller.signal })
            .then((response) => {
                setDetail(response.data);
                setDetailStatus('ready');
            })
            .catch((loadError) => {
                if (loadError?.name === 'AbortError') return;
                setDetailError(loadError?.message || 'לא ניתן לטעון את פרטי הפנייה.');
                setDetailStatus('error');
            });
        return () => controller.abort();
    }, [canonicalTicketId]);

useEffect(() => {
    if (!ticket.roomId || !ticket.boardType || !canonicalTicketId) {
        return undefined;
    }
    return subscribeBoardRealtime({
        roomId: ticket.roomId,
        boardType: ticket.boardType,
        onInvalidate: async () => {
            try {
                const response = await ticketsApi.get(canonicalTicketId);
                setDetail(response.data);
                if (activeTab === 'history') {
                    const historyResponse = await ticketsApi.history(
                        canonicalTicketId,
                        { page: 1, limit: 100, sortDirection: 'desc' }
                    );
                    setHistoryState({
                        status: 'ready',
                        items: historyResponse.data?.items || [],
                        error: ''
                    });
                }
            } catch {
                // The next explicit user action will surface the current error.
            }
        }
    });
}, [
    activeTab,
    canonicalTicketId,
    ticket.boardType,
    ticket.roomId
]);

useEffect(() => {
    if (activeTab !== 'history' || !canonicalTicketId) return undefined;
    const controller = new AbortController();
    setHistoryState((current) => ({
        ...current,
        status: 'loading',
        error: ''
    }));
    ticketsApi.history(
        canonicalTicketId,
        { page: 1, limit: 100, sortDirection: 'desc' },
        { signal: controller.signal }
    ).then((response) => {
        setHistoryState({
            status: 'ready',
            items: response.data?.items || [],
            error: ''
        });
    }).catch((historyError) => {
        if (historyError?.name === 'AbortError') return;
        setHistoryState({
            status: 'error',
            items: [],
            error: historyError?.message
                || 'לא ניתן לטעון את היסטוריית השינויים.'
        });
    });
    return () => controller.abort();
}, [activeTab, canonicalTicketId]);

const resolvedTicket = detail || ticket.ticket || ticket;

    const fieldValues = resolvedTicket.fieldValues || ticket.fieldValues || {};
    const serverCapabilities = resolvedTicket.capabilities || {};
    const viewCapabilities = getTicketCapabilities(viewType);
    const capabilities = {
        ...viewCapabilities,
        canEdit: Boolean(serverCapabilities.canEdit),
        canClose: Boolean(serverCapabilities.canClose),
            canChat: Boolean(serverCapabilities.canWriteChat),
    canSend: Boolean(viewCapabilities.canSend && serverCapabilities.canTransfer),
    canAcceptTransfer: Boolean(serverCapabilities.canAcceptTransfer),
    canCancelTransfer: Boolean(serverCapabilities.canCancelTransfer)
};

    const modalTabs = getTicketModalTabs(viewType).filter((tab) => tab.id !== 'send' || capabilities.canSend);
    const displayTicket = {
        ...ticket,
        ticket: resolvedTicket,
        ticketId: canonicalTicketId,
transferId: ticket.transferId || ticket.transfer?.id || null,
ticketVersion: Number(resolvedTicket.version) || ticket.ticketVersion || 0,

        capabilities: serverCapabilities,
        subject: resolvedTicket.subject || ticket.name || '',
        description: resolvedTicket.description || ticket.description || '',
        priority: ticket.priority || resolvedTicket.priority,
        phone: fieldValues.phone || '',
        customerId: fieldValues.customerId || '',
        handler: (resolvedTicket.activeAssignees || []).map((item) => item.displayName).filter(Boolean).join(', ') || fieldValues.handler || '',
        treatment: fieldValues.treatment || '',
        network: fieldValues.network || '',
        createdAt: resolvedTicket.createdAt || ticket.createdAt,
        closedAt: resolvedTicket.closure?.closedAt || ticket.closedAt
    };
    const status = resolvedTicket.status === 'CLOSED' ? 'סגורה' : 'פתוחה';
    const layoutFields = layoutSettings.fields?.length ? layoutSettings.fields : defaultInquiryFields;
    const layoutSections = layoutSettings.sections?.length ? layoutSettings.sections : createDefaultSections(layoutFields);
    const readOnlyLayoutFieldIds = new Set([
    'status',
    'openDate',
    'closingDate'
]);
    const layoutValues = {
        ...fieldValues,
        ...(isEditing ? editDraft?.fieldValues : {}),
        priority: isEditing ? editDraft?.priority : displayTicket.priority,
        handler: isEditing ? editDraft?.fieldValues?.handler : displayTicket.handler,
        description: isEditing ? editDraft?.description : displayTicket.description,
        phone: isEditing ? editDraft?.fieldValues?.phone : displayTicket.phone,
        customerId: isEditing ? editDraft?.fieldValues?.customerId : displayTicket.customerId,
        treatment: isEditing ? editDraft?.fieldValues?.treatment : displayTicket.treatment,
        network: isEditing ? editDraft?.fieldValues?.network : displayTicket.network,
        status,
        openDate: displayTicket.createdAt ? new Date(displayTicket.createdAt).toISOString().slice(0, 10) : '',
        closingDate: displayTicket.closedAt ? new Date(displayTicket.closedAt).toISOString().slice(0, 10) : ''
    };
    const chatTitle = 'צ׳אט הפנייה';

    const startEditing = () => {
        setEditDraft({
            subject: displayTicket.subject,
            description: displayTicket.description,
            priority: resolvedTicket.priority,
            fieldValues: { ...fieldValues }
        });
        setIsEditing(true);
    };
    const updateFieldValue = (key, value) => setEditDraft((current) => ({
        ...current,
        fieldValues: { ...(current?.fieldValues || {}), [key]: value }
    }));
    const saveChanges = async () => {
    if (!editDraft || !canonicalTicketId) return;
    setDetailError('');
    setDetailStatus('saving');
    try {
        const response = await ticketsApi.update(
            canonicalTicketId,
            editDraft,
            displayTicket.ticketVersion
        );
        setDetail(response.data);
        setIsEditing(false);
        setEditDraft(null);
        setDetailStatus('ready');
        onUpdated?.(response.data);
    } catch (saveError) {
        setDetailError(
            saveError?.message
            || 'לא ניתן לשמור את השינויים בפנייה.'
        );
        setDetailStatus('error');
    }
};

const resolveTransfer = async (action) => {
    const transferId = displayTicket.transferId;
    if (!transferId || workflowStatus === 'saving') return;

    let reason = '';
    if (action === 'cancel') {
        reason = window.prompt(
            'יש להזין סיבה לביטול ההעברה:',
            ''
        )?.trim() || '';
        if (!reason) return;
    }

    setWorkflowStatus('saving');
    setDetailError('');
    try {
        const response = action === 'accept'
            ? await ticketsApi.acceptTransfer(
                transferId,
                displayTicket.ticketVersion
            )
            : await ticketsApi.cancelTransfer(
                transferId,
                displayTicket.ticketVersion,
                reason
            );
        const nextTicket = response.data?.ticket;
        if (nextTicket) {
            setDetail(nextTicket);
            onUpdated?.(nextTicket);
        }
        setActiveTab('info');
    } catch (workflowError) {
        setDetailError(
            workflowError?.message
            || 'לא ניתן להשלים את פעולת ההעברה.'
        );
    } finally {
        setWorkflowStatus('idle');
    }
};

return (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" dir="rtl">
            <div className="inquiry-backdrop absolute inset-0" onClick={onClose} />

            <div data-testid="ticket-details-modal" className="inquiry-overlay-panel relative z-10 flex max-h-[88vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[22px] font-black tracking-tight inquiry-primary-text">{displayTicket.displayId || displayTicket.ticketNumber || displayTicket.id}</h2>
                        <span className="inline-flex h-8 items-center rounded-lg bg-emerald-500 px-4 text-[12px] font-black text-white shadow-sm">{status}</span>
                        <InquiryUrgencyBadge priority={ticket.priority || 'בינונית-2'} />
                    </div>
                    <button data-testid="ticket-details-close" type="button" onClick={onClose} className="inquiry-control flex h-8 w-8 items-center justify-center rounded-lg p-0 inquiry-muted-text hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex shrink-0 items-center gap-6 border-b border-[var(--color-border)] px-5">
                    {modalTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative py-3 text-[13px] font-black transition ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'inquiry-muted-text hover:text-[var(--color-text-primary)]'}`}
                        >
                            {tab.label}
                            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-[var(--color-primary)]" />}
                        </button>
                    ))}
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                        {detailError && <div className="mx-auto mb-3 max-w-[850px] rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300">{detailError}</div>}
                        {detailStatus === 'loading' && <div className="mx-auto mb-3 max-w-[850px] text-xs font-bold inquiry-muted-text">טוען את פרטי הפנייה…</div>}
                        {activeTab === 'info' && (
                            <div className="mx-auto max-w-[850px] space-y-4">
                                <div className="flex items-center gap-2">
                                    {capabilities.canEdit && !isEditing && <ModalActionButton icon="filePlus" onClick={startEditing}>עריכת פנייה</ModalActionButton>}
                                    {capabilities.canChat && <ModalActionButton icon="chat" onClick={() => setIsChatOpen(true)}>{chatTitle}</ModalActionButton>}
                                    {capabilities.canClose && <ModalActionButton icon="check" tone="success" onClick={onCloseInquiry}>סגירת פנייה</ModalActionButton>}
{capabilities.canAcceptTransfer && (
    <ModalActionButton
        icon="check"
        tone="primary"
        onClick={() => resolveTransfer('accept')}
    >
        {workflowStatus === 'saving' ? 'מבצע…' : 'קבלת פנייה'}
    </ModalActionButton>
)}
{capabilities.canCancelTransfer && (
    <ModalActionButton
        icon="close"
        onClick={() => resolveTransfer('cancel')}
    >
        ביטול העברה
    </ModalActionButton>
)}
{isEditing && (

                                        <>
                                            <ModalActionButton icon="check" tone="primary" onClick={saveChanges}>{detailStatus === 'saving' ? 'שומר…' : 'שמור שינויים'}</ModalActionButton>
                                            <ModalActionButton icon="close" onClick={() => { setIsEditing(false); setEditDraft(null); }}>ביטול</ModalActionButton>
                                        </>
                                    )}
                                </div>

                                <InquiryFormCanvas
                                    fields={layoutFields}
                                    sections={layoutSections}
                                    values={layoutValues}
                                    editableValues={isEditing}
                                    isFieldEditable={(field) => !readOnlyLayoutFieldIds.has(field.id)}
                                    onValueChange={(fieldId, value) => {
                                        if (fieldId === 'description') {
                                            setEditDraft((current) => ({ ...current, description: value }));
                                        } else {
                                            updateFieldValue(fieldId, value);
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'history' && (
    <div className="mx-auto max-w-[850px] space-y-2">
        {historyState.status === 'loading' && (
            <div className="text-xs font-bold inquiry-muted-text">
                טוען היסטוריית שינויים…
            </div>
        )}
        {historyState.error && (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300">
                {historyState.error}
            </div>
        )}
        {historyState.items.map((entry) => (
            <article
                key={entry.id}
                className="inquiry-panel rounded-xl p-3"
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-[13px] inquiry-primary-text">
                        {entry.actor?.displayName || 'משתמש מערכת'}
                    </strong>
                    <time className="text-[11px] font-bold inquiry-muted-text">
                        {new Date(entry.createdAt).toLocaleString('he-IL')}
                    </time>
                </div>
                <div className="mt-1 text-[12px] font-bold inquiry-secondary-text">
                    {entry.eventType} · {entry.changedFields?.join(', ') || 'ללא שינויי שדות'}
                </div>
            </article>
        ))}
        {historyState.status === 'ready'
            && historyState.items.length === 0
            && (
                <div className="text-center text-xs font-bold inquiry-muted-text">
                    אין עדיין אירועי היסטוריה.
                </div>
            )}
    </div>
)}

{activeTab === 'send' && capabilities.canSend && (
    <div className="mx-auto max-w-[850px]">
        <SendInquiryView
            ticket={displayTicket}
            onTransferred={onTransferred}
        />
    </div>
)}

                    </div>

                    {isChatOpen && canonicalTicketId && (
                        <TicketChatDrawer
                            open
                            ticketId={canonicalTicketId}
                            title={chatTitle}
                            currentUser={currentUser}
                            onClose={() => setIsChatOpen(false)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
