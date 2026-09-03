import { io } from 'socket.io-client';
import { getAccessToken } from '../api/authenticatedHttpClient.js';
import { BOARD_TYPES } from '../domain/boardTypes.js';

const BOARD_EVENTS = ['board:category-created', 'board:category-updated', 'board:category-archived', 'board:item-state-updated'];
const WORKFLOW_EVENTS = ['ticket:created', 'ticket:updated', 'ticket:closed', 'transfer:initiated', 'transfer:accepted', 'transfer:cancelled'];
const CHAT_EVENTS = ['chat:message-created', 'chat:message-updated', 'chat:message-deleted'];
const ACCESS_REQUEST_EVENTS = ['access-request:created', 'access-request:updated', 'permissions:updated'];
const workflowBoardTypes = Object.freeze({
    'ticket:created': new Set([BOARD_TYPES.OPEN]),
    'ticket:updated': new Set(Object.values(BOARD_TYPES)),
    'ticket:closed': new Set(Object.values(BOARD_TYPES)),
    'transfer:initiated': new Set([BOARD_TYPES.OPEN, BOARD_TYPES.EXTERNAL_SENT, BOARD_TYPES.EXTERNAL_RECEIVED]),
    'transfer:accepted': new Set([BOARD_TYPES.OPEN, BOARD_TYPES.EXTERNAL_SENT, BOARD_TYPES.EXTERNAL_RECEIVED]),
    'transfer:cancelled': new Set([BOARD_TYPES.OPEN, BOARD_TYPES.EXTERNAL_SENT, BOARD_TYPES.EXTERNAL_RECEIVED])
});
const socketUrl = String(import.meta.env?.VITE_SOCKET_URL || '') || undefined;

let socket = null;
let subscribers = 0;

const getSocket = () => {
    if (socket) return socket;
    socket = io(socketUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        auth: async (callback) => {
            try { callback({ accessToken: await getAccessToken() }); }
            catch { callback({}); }
        }
    });
    return socket;
};

const workflowMatchesRoom = (payload, roomId) => [
    payload?.currentRoomId,
    payload?.sourceRoomId,
    payload?.destinationRoomId
].filter(Boolean).some((value) => String(value) === String(roomId));

export const shouldInvalidateBoardEvent = (payload, roomId, boardType) => (
    String(payload?.roomId) === String(roomId) && payload?.boardType === boardType
);

export const shouldInvalidateWorkflowEvent = (eventName, payload, roomId, boardType) => (
    Boolean(workflowBoardTypes[eventName]?.has(boardType)) && workflowMatchesRoom(payload, roomId)
);

export const shouldRefreshAfterSocketConnect = (hasConnectedBefore) => Boolean(hasConnectedBefore);
export const shouldInvalidateChatEvent = (payload, ticketId) => (
    Boolean(ticketId) && String(payload?.ticketId) === String(ticketId)
);

export const subscribeBoardRealtime = ({ roomId, boardType, onInvalidate, onConnectionChange }) => {
    const activeSocket = getSocket();
    subscribers += 1;
    let timer = null;
    let disposed = false;
    let hasConnected = activeSocket.connected;

    const schedule = (reason) => {
        if (disposed) return;
        clearTimeout(timer);
        timer = setTimeout(() => onInvalidate?.(reason), 180);
    };
    const onBoardEvent = (payload) => {
        if (shouldInvalidateBoardEvent(payload, roomId, boardType)) schedule(payload?.eventType);
    };
    const workflowHandlers = new Map(WORKFLOW_EVENTS.map((eventName) => [eventName, (payload) => {
        if (shouldInvalidateWorkflowEvent(eventName, payload, roomId, boardType)) schedule(eventName);
    }]));
    const onConnect = () => {
        const reconnect = shouldRefreshAfterSocketConnect(hasConnected);
        hasConnected = true;
        onConnectionChange?.(true);
        if (reconnect) schedule('socket:reconnect');
    };
    const onDisconnect = () => onConnectionChange?.(false);

    BOARD_EVENTS.forEach((eventName) => activeSocket.on(eventName, onBoardEvent));
    workflowHandlers.forEach((handler, eventName) => activeSocket.on(eventName, handler));
    activeSocket.on('connect', onConnect);
    activeSocket.on('disconnect', onDisconnect);
    if (!activeSocket.connected) activeSocket.connect();

    return () => {
        disposed = true;
        clearTimeout(timer);
        BOARD_EVENTS.forEach((eventName) => activeSocket.off(eventName, onBoardEvent));
        workflowHandlers.forEach((handler, eventName) => activeSocket.off(eventName, handler));
        activeSocket.off('connect', onConnect);
        activeSocket.off('disconnect', onDisconnect);
        subscribers = Math.max(0, subscribers - 1);
        if (subscribers === 0) activeSocket.disconnect();
    };
};

export const subscribeTicketChatRealtime = ({ ticketId, onInvalidate, onConnectionChange }) => {
    const activeSocket = getSocket();
    subscribers += 1;
    let timer = null;
    let disposed = false;
    let latestPayload = null;
    let hasConnected = activeSocket.connected;

    const schedule = (payload) => {
        if (disposed) return;
        latestPayload = payload;
        clearTimeout(timer);
        timer = setTimeout(() => {
            const nextPayload = latestPayload;
            latestPayload = null;
            onInvalidate?.(nextPayload);
        }, 180);
    };
    const messageHandlers = new Map(CHAT_EVENTS.map((eventName) => [eventName, (payload) => {
        if (shouldInvalidateChatEvent(payload, ticketId)) schedule({ ...payload, eventType: eventName });
    }]));
    const onConnect = () => {
        const reconnect = shouldRefreshAfterSocketConnect(hasConnected);
        hasConnected = true;
        onConnectionChange?.(true);
        if (reconnect) schedule({ ticketId, eventType: 'socket:reconnect' });
    };
    const onDisconnect = () => onConnectionChange?.(false);

    messageHandlers.forEach((handler, eventName) => activeSocket.on(eventName, handler));
    activeSocket.on('connect', onConnect);
    activeSocket.on('disconnect', onDisconnect);
    onConnectionChange?.(activeSocket.connected);
    if (!activeSocket.connected) activeSocket.connect();

    return () => {
        disposed = true;
        clearTimeout(timer);
        latestPayload = null;
        messageHandlers.forEach((handler, eventName) => activeSocket.off(eventName, handler));
        activeSocket.off('connect', onConnect);
        activeSocket.off('disconnect', onDisconnect);
        subscribers = Math.max(0, subscribers - 1);
        if (subscribers === 0) activeSocket.disconnect();
    };
};
export const subscribeAccessRequestRealtime = ({ onInvalidate, onPermissionsUpdated, onConnectionChange }) => {
    const activeSocket = getSocket();
    subscribers += 1;
    let timer = null;
    let disposed = false;
    let permissionsChanged = false;
    let hasConnected = activeSocket.connected;

    const schedule = (eventName, payload) => {
        if (disposed) return;
        permissionsChanged = permissionsChanged || eventName === 'permissions:updated';
        clearTimeout(timer);
        timer = setTimeout(() => {
            const refreshPermissions = permissionsChanged;
            permissionsChanged = false;
            onInvalidate?.({ eventType: eventName, ...payload });
            if (refreshPermissions) onPermissionsUpdated?.();
        }, 180);
    };
    const handlers = new Map(ACCESS_REQUEST_EVENTS.map((eventName) => [eventName, (payload) => schedule(eventName, payload)]));
    const onConnect = () => {
        const reconnect = shouldRefreshAfterSocketConnect(hasConnected);
        hasConnected = true;
        onConnectionChange?.(true);
        if (reconnect) schedule('socket:reconnect', {});
    };
    const onDisconnect = () => onConnectionChange?.(false);

    handlers.forEach((handler, eventName) => activeSocket.on(eventName, handler));
    activeSocket.on('connect', onConnect);
    activeSocket.on('disconnect', onDisconnect);
    onConnectionChange?.(activeSocket.connected);
    if (!activeSocket.connected) activeSocket.connect();

    return () => {
        disposed = true;
        clearTimeout(timer);
        handlers.forEach((handler, eventName) => activeSocket.off(eventName, handler));
        activeSocket.off('connect', onConnect);
        activeSocket.off('disconnect', onDisconnect);
        subscribers = Math.max(0, subscribers - 1);
        if (subscribers === 0) activeSocket.disconnect();
    };
};
export const closeBoardSocket = () => {
    socket?.disconnect();
    socket = null;
    subscribers = 0;
};