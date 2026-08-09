import { useEffect, useRef, useState } from 'react';
import { ticketMessagesApi } from '../api/ticketMessagesApi.js';
import { classifyTicketMessageError } from '../api/ticketMessageErrors.js';
import {
    adaptTicketMessage,
    createClientMessageId,
    MESSAGE_LIMIT,
    mergeTicketMessages,
    pagesToRefresh,
    replaceTicketMessage,
    validateMessageContent
} from '../domain/ticketMessageModel.js';
import { subscribeTicketChatRealtime } from '../../boards/realtime/boardSocket.js';

const emptyPageInfo = Object.freeze({
    limit: MESSAGE_LIMIT,
    hasMoreBefore: false,
    nextBeforeCursor: null
});

const mutationConflictCodes = new Set([
    'MESSAGE_VERSION_CONFLICT',
    'MESSAGE_ALREADY_DELETED',
    'MESSAGE_CANNOT_EDIT_DELETED',
    'PRECONDITION_REQUIRED'
]);

export const useTicketMessages = ({ ticketId, enabled }) => {
    const [ticketDetails, setTicketDetails] = useState(null);
    const [messages, setMessages] = useState([]);
    const [pageInfo, setPageInfo] = useState(emptyPageInfo);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [realtimeConnected, setRealtimeConnected] = useState(false);
    const [createState, setCreateState] = useState({ pending: false, error: null });
    const [messageMutation, setMessageMutation] = useState({ messageId: null, type: null, error: null });
    const [conflict, setConflict] = useState(null);
    const [change, setChange] = useState({ revision: 0, reason: 'idle', messageId: null });
    const [boundedRefreshNotice, setBoundedRefreshNotice] = useState('');
    const [reloadToken, setReloadToken] = useState(0);
    const sequenceRef = useRef(0);
    const controllersRef = useRef(new Set());
    const messagesRef = useRef(messages);
    const pageInfoRef = useRef(pageInfo);
    const refreshRef = useRef(null);
    const createAttemptRef = useRef(null);
    const createPendingRef = useRef(false);

    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { pageInfoRef.current = pageInfo; }, [pageInfo]);

    const registerController = () => {
        const controller = new AbortController();
        controllersRef.current.add(controller);
        return controller;
    };
    const releaseController = (controller) => controllersRef.current.delete(controller);
    const abortAll = () => {
        controllersRef.current.forEach((controller) => controller.abort());
        controllersRef.current.clear();
    };
    const isCurrent = (sequence, scopedTicketId) => (
        sequence === sequenceRef.current
        && enabled
        && String(scopedTicketId) === String(ticketId)
    );
    const commitMessages = (updater, reason, messageId = null) => {
        setMessages((current) => {
            const next = typeof updater === 'function' ? updater(current) : updater;
            messagesRef.current = next;
            return next;
        });
        setChange((current) => ({ revision: current.revision + 1, reason, messageId }));
    };
    const clearForAccessLoss = (nextError) => {
        messagesRef.current = [];
        setMessages([]);
        setTicketDetails(null);
        setPageInfo(emptyPageInfo);
        setError(nextError);
        setStatus('inaccessible');
        setConflict(null);
        setBoundedRefreshNotice('');
    };

    useEffect(() => {
        const sequence = ++sequenceRef.current;
        abortAll();
        createAttemptRef.current = null;
        createPendingRef.current = false;
        setTicketDetails(null);
        messagesRef.current = [];
        setMessages([]);
        setPageInfo(emptyPageInfo);
        setError(null);
        setConflict(null);
        setCreateState({ pending: false, error: null });
        setMessageMutation({ messageId: null, type: null, error: null });
        setBoundedRefreshNotice('');
        setRealtimeConnected(false);
        setChange((current) => ({ revision: current.revision + 1, reason: 'ticket-change', messageId: null }));

        if (!enabled || !ticketId) {
            setStatus('idle');
            return undefined;
        }

        const controller = registerController();
        setStatus('loading');
        Promise.all([
            ticketMessagesApi.getTicketDetails({ ticketId, signal: controller.signal }),
            ticketMessagesApi.getTicketMessages({ ticketId, limit: MESSAGE_LIMIT, signal: controller.signal })
        ]).then(([ticketResponse, messageResponse]) => {
            if (!isCurrent(sequence, ticketId)) return;
            const nextMessages = (messageResponse.data?.items || []).map((item) => adaptTicketMessage(item));
            setTicketDetails(ticketResponse.data || null);
            setPageInfo(messageResponse.data?.pageInfo || emptyPageInfo);
            pageInfoRef.current = messageResponse.data?.pageInfo || emptyPageInfo;
            commitMessages(nextMessages, 'initial');
            setStatus('ready');
        }).catch((nextError) => {
            if (nextError?.name === 'AbortError' || !isCurrent(sequence, ticketId)) return;
            const classified = classifyTicketMessageError(nextError, 'לא ניתן לטעון את שיחת הפנייה.');
            if (classified.accessLost || classified.authentication) clearForAccessLoss(classified);
            else {
                setError(classified);
                setStatus('error');
            }
        }).finally(() => releaseController(controller));

        return () => {
            controller.abort();
            releaseController(controller);
        };
    }, [enabled, reloadToken, ticketId]);

    const refreshConversation = async ({ reason = 'manual', messageId = null } = {}) => {
        if (!enabled || !ticketId || status === 'loading') return false;
        const scopedTicketId = ticketId;
        const sequence = sequenceRef.current;
        const controller = registerController();
        setRefreshing(true);
        setBoundedRefreshNotice('');
        try {
            const pageCount = pagesToRefresh(messagesRef.current.length);
            let before = null;
            let latestPageInfo = emptyPageInfo;
            const refreshed = [];
            for (let index = 0; index < pageCount; index += 1) {
                const response = await ticketMessagesApi.getTicketMessages({
                    ticketId: scopedTicketId,
                    limit: MESSAGE_LIMIT,
                    before,
                    signal: controller.signal
                });
                const page = (response.data?.items || []).map((item) => adaptTicketMessage(item));
                refreshed.push(...page);
                latestPageInfo = response.data?.pageInfo || emptyPageInfo;
                before = latestPageInfo.nextBeforeCursor;
                if (!latestPageInfo.hasMoreBefore || !before) break;
            }
            if (!isCurrent(sequence, scopedTicketId)) return false;
            commitMessages((current) => mergeTicketMessages(current, refreshed), reason, messageId);
            setPageInfo(latestPageInfo);
            pageInfoRef.current = latestPageInfo;
            setError(null);
            setStatus('ready');
            if (messageId && messagesRef.current.some((message) => message.id === messageId)
                && !refreshed.some((message) => message.id === messageId)) {
                setBoundedRefreshNotice('הודעה ישנה נמצאת מחוץ לחלון הרענון. ניתן לרענן ידנית או לטעון מחדש את השיחה.');
            }
            return true;
        } catch (nextError) {
            if (nextError?.name === 'AbortError' || !isCurrent(sequence, scopedTicketId)) return false;
            const classified = classifyTicketMessageError(nextError, 'לא ניתן לרענן את השיחה.');
            if (classified.accessLost || classified.authentication) clearForAccessLoss(classified);
            else setError(classified);
            return false;
        } finally {
            releaseController(controller);
            if (isCurrent(sequence, scopedTicketId)) setRefreshing(false);
        }
    };
    refreshRef.current = refreshConversation;

    useEffect(() => {
        if (!enabled || !ticketId || status !== 'ready') return undefined;
        return subscribeTicketChatRealtime({
            ticketId,
            onInvalidate: (payload) => refreshRef.current?.({
                reason: 'realtime',
                messageId: payload?.messageId || null
            }),
            onConnectionChange: setRealtimeConnected
        });
    }, [enabled, status, ticketId]);

    const loadOlder = async () => {
        const currentPage = pageInfoRef.current;
        if (!enabled || !ticketId || loadingOlder || !currentPage.hasMoreBefore || !currentPage.nextBeforeCursor) return false;
        const scopedTicketId = ticketId;
        const sequence = sequenceRef.current;
        const controller = registerController();
        setLoadingOlder(true);
        try {
            const response = await ticketMessagesApi.getTicketMessages({
                ticketId: scopedTicketId,
                limit: MESSAGE_LIMIT,
                before: currentPage.nextBeforeCursor,
                signal: controller.signal
            });
            if (!isCurrent(sequence, scopedTicketId)) return false;
            const older = (response.data?.items || []).map((item) => adaptTicketMessage(item));
            commitMessages((current) => mergeTicketMessages(older, current), 'older');
            setPageInfo(response.data?.pageInfo || emptyPageInfo);
            pageInfoRef.current = response.data?.pageInfo || emptyPageInfo;
            return true;
        } catch (nextError) {
            if (nextError?.name === 'AbortError' || !isCurrent(sequence, scopedTicketId)) return false;
            setError(classifyTicketMessageError(nextError, 'לא ניתן לטעון הודעות קודמות.'));
            return false;
        } finally {
            releaseController(controller);
            if (isCurrent(sequence, scopedTicketId)) setLoadingOlder(false);
        }
    };

    const sendMessage = async (draft) => {
        const validation = validateMessageContent(draft);
        if (!validation.valid) {
            setCreateState({ pending: false, error: { message: validation.message, code: 'LOCAL_VALIDATION' } });
            return { ok: false, validation: true };
        }
        if (createPendingRef.current) return { ok: false, pending: true };

        let attempt = createAttemptRef.current;
        if (!attempt || attempt.content !== validation.content) {
            attempt = { clientMessageId: createClientMessageId(), content: validation.content };
            createAttemptRef.current = attempt;
        }
        const scopedTicketId = ticketId;
        const sequence = sequenceRef.current;
        const controller = registerController();
        createPendingRef.current = true;
        setCreateState({ pending: true, error: null });
        try {
            const response = await ticketMessagesApi.createTicketMessage({
                ticketId: scopedTicketId,
                clientMessageId: attempt.clientMessageId,
                content: attempt.content,
                signal: controller.signal
            });
            if (!isCurrent(sequence, scopedTicketId)) return { ok: false, stale: true };
            const created = adaptTicketMessage(response.data?.message, response.etag);
            commitMessages((current) => mergeTicketMessages(current, [created]), 'own-create', created.id);
            createAttemptRef.current = null;
            setCreateState({ pending: false, error: null });
            return {
                ok: true,
                message: created,
                replayed: response.status === 200,
                clientMessageId: response.data?.acknowledgement?.clientMessageId
            };
        } catch (nextError) {
            if (nextError?.name === 'AbortError' || !isCurrent(sequence, scopedTicketId)) return { ok: false, stale: true };
            const classified = classifyTicketMessageError(nextError, 'לא ניתן לשלוח את ההודעה. הטקסט נשמר וניתן לנסות שוב.');
            if (classified.accessLost || classified.authentication) clearForAccessLoss(classified);
            setCreateState({ pending: false, error: classified });
            return { ok: false, error: classified };
        } finally {
            releaseController(controller);
            if (isCurrent(sequence, scopedTicketId)) createPendingRef.current = false;
        }
    };

    const updateMessage = async (message, draft) => {
        const validation = validateMessageContent(draft);
        if (!validation.valid) {
            setMessageMutation({ messageId: message.id, type: 'edit', error: { message: validation.message, code: 'LOCAL_VALIDATION' } });
            return { ok: false, validation: true };
        }
        if (validation.content === message.content) {
            setMessageMutation({ messageId: message.id, type: 'edit', error: { message: 'לא בוצע שינוי בתוכן ההודעה.', code: 'LOCAL_NOOP' } });
            return { ok: false, validation: true };
        }
        const scopedTicketId = ticketId;
        const sequence = sequenceRef.current;
        const controller = registerController();
        setMessageMutation({ messageId: message.id, type: 'edit', error: null });
        try {
            const response = await ticketMessagesApi.updateTicketMessage({
                ticketId: scopedTicketId,
                messageId: message.id,
                content: validation.content,
                ifMatch: message.messageEtag,
                signal: controller.signal
            });
            if (!isCurrent(sequence, scopedTicketId)) return { ok: false, stale: true };
            const updated = adaptTicketMessage(response.data?.message, response.etag);
            commitMessages((current) => replaceTicketMessage(current, updated), 'own-edit', updated.id);
            setConflict(null);
            setMessageMutation({ messageId: null, type: null, error: null });
            return { ok: true, message: updated };
        } catch (nextError) {
            if (nextError?.name === 'AbortError' || !isCurrent(sequence, scopedTicketId)) return { ok: false, stale: true };
            const classified = classifyTicketMessageError(nextError, 'לא ניתן לערוך את ההודעה.');
            if (classified.accessLost || classified.authentication) clearForAccessLoss(classified);
            if (mutationConflictCodes.has(classified.code) || classified.conflict) {
                await refreshRef.current?.({ reason: 'conflict', messageId: message.id });
                const currentMessage = messagesRef.current.find((item) => item.id === message.id);
                setConflict({ type: 'edit', messageId: message.id, draft: validation.content, serverContent: currentMessage?.content || null, message: classified.message });
            }
            setMessageMutation({ messageId: message.id, type: 'edit', error: classified });
            return { ok: false, error: classified };
        } finally {
            releaseController(controller);
        }
    };

    const deleteMessage = async (message) => {
        const scopedTicketId = ticketId;
        const sequence = sequenceRef.current;
        const controller = registerController();
        setMessageMutation({ messageId: message.id, type: 'delete', error: null });
        try {
            const response = await ticketMessagesApi.deleteTicketMessage({
                ticketId: scopedTicketId,
                messageId: message.id,
                ifMatch: message.messageEtag,
                signal: controller.signal
            });
            if (!isCurrent(sequence, scopedTicketId)) return { ok: false, stale: true };
            const deleted = adaptTicketMessage(response.data?.message, response.etag);
            commitMessages((current) => replaceTicketMessage(current, deleted), 'own-delete', deleted.id);
            setConflict(null);
            setMessageMutation({ messageId: null, type: null, error: null });
            return { ok: true, message: deleted };
        } catch (nextError) {
            if (nextError?.name === 'AbortError' || !isCurrent(sequence, scopedTicketId)) return { ok: false, stale: true };
            const classified = classifyTicketMessageError(nextError, 'לא ניתן למחוק את ההודעה.');
            if (classified.accessLost || classified.authentication) clearForAccessLoss(classified);
            if (mutationConflictCodes.has(classified.code) || classified.conflict) {
                await refreshRef.current?.({ reason: 'conflict', messageId: message.id });
                setConflict({ type: 'delete', messageId: message.id, draft: null, message: classified.message });
            }
            setMessageMutation({ messageId: message.id, type: 'delete', error: classified });
            return { ok: false, error: classified };
        } finally {
            releaseController(controller);
        }
    };

    useEffect(() => () => {
        sequenceRef.current += 1;
        abortAll();
    }, []);

    return {
        ticketDetails,
        messages,
        pageInfo,
        status,
        error,
        refreshing,
        loadingOlder,
        realtimeConnected,
        createState,
        messageMutation,
        conflict,
        change,
        boundedRefreshNotice,
        canWriteChat: Boolean(ticketDetails?.capabilities?.canWriteChat),
        loadOlder,
        refresh: () => refreshRef.current?.({ reason: 'manual' }),
        retry: () => setReloadToken((current) => current + 1),
        sendMessage,
        updateMessage,
        deleteMessage,
        clearCreateError: () => setCreateState((current) => ({ ...current, error: null })),
        clearMessageError: () => setMessageMutation({ messageId: null, type: null, error: null }),
        clearConflict: () => setConflict(null)
    };
};
