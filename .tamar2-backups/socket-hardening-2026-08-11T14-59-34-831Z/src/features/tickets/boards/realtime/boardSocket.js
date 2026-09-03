import { io } from 'socket.io-client';
import { getAccessToken } from '../api/authenticatedHttpClient.js';
import { BOARD_TYPES } from '../domain/boardTypes.js';

const BOARD_EVENTS = [
    'board:category-created',
    'board:category-updated',
    'board:category-archived',
    'board:item-state-updated'
];
const WORKFLOW_EVENTS = [
    'ticket:created',
    'ticket:updated',
    'ticket:closed',
    'transfer:initiated',
    'transfer:accepted',
    'transfer:cancelled'
];
const CHAT_EVENTS = [
    'chat:message-created',
    'chat:message-updated',
    'chat:message-deleted'
];
const ACCESS_REQUEST_EVENTS = [
    'access-request:created',
    'access-request:updated',
    'permissions:updated'
];
const ORGANIZATION_EVENTS = [
    'organization:environment-created',
    'organization:sub-environment-created',
    'organization:room-created'
];
const SETTINGS_EVENTS = ['settings:updated'];
const SYSTEM_EVENTS = [
    ...ORGANIZATION_EVENTS,
    'permissions:updated',
    'dashboard:invalidate'
];

const workflowBoardTypes = Object.freeze({
    'ticket:created': new Set([BOARD_TYPES.OPEN]),
    'ticket:updated': new Set(Object.values(BOARD_TYPES)),
    'ticket:closed': new Set(Object.values(BOARD_TYPES)),
    'transfer:initiated': new Set([
        BOARD_TYPES.OPEN,
        BOARD_TYPES.EXTERNAL_SENT,
        BOARD_TYPES.EXTERNAL_RECEIVED
    ]),
    'transfer:accepted': new Set([
        BOARD_TYPES.OPEN,
        BOARD_TYPES.EXTERNAL_SENT,
        BOARD_TYPES.EXTERNAL_RECEIVED
    ]),
    'transfer:cancelled': new Set([
        BOARD_TYPES.OPEN,
        BOARD_TYPES.EXTERNAL_SENT,
        BOARD_TYPES.EXTERNAL_RECEIVED
    ])
});

const socketUrl = String(
    import.meta.env?.VITE_SOCKET_URL || ''
) || undefined;

let socket = null;
let subscribers = 0;

const getSocket = () => {
    if (socket) return socket;

    socket = io(socketUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        auth: async (callback) => {
            try {
                callback({ accessToken: await getAccessToken() });
            } catch {
                callback({});
            }
        }
    });
    return socket;
};

const payloadRoomIds = (payload) => [
    payload?.roomId,
    payload?.currentRoomId,
    payload?.sourceRoomId,
    payload?.destinationRoomId,
    ...(Array.isArray(payload?.visibleRoomIds)
        ? payload.visibleRoomIds
        : [])
].filter(Boolean).map(String);

const workflowMatchesRoom = (payload, roomId) => (
    payloadRoomIds(payload).includes(String(roomId))
);

export const shouldInvalidateBoardEvent = (
    payload,
    roomId,
    boardType
) => (
    String(payload?.roomId) === String(roomId)
    && payload?.boardType === boardType
);

export const shouldInvalidateWorkflowEvent = (
    eventName,
    payload,
    roomId,
    boardType
) => (
    Boolean(workflowBoardTypes[eventName]?.has(boardType))
    && workflowMatchesRoom(payload, roomId)
);

export const shouldRefreshAfterSocketConnect = (hasConnectedBefore) => (
    Boolean(hasConnectedBefore)
);

export const shouldInvalidateChatEvent = (payload, ticketId) => (
    Boolean(ticketId)
    && String(payload?.ticketId) === String(ticketId)
);

const createSubscription = ({
    eventHandlers,
    onConnectionChange,
    onReconnect
}) => {
    const activeSocket = getSocket();
    subscribers += 1;
    let disposed = false;
    let hasConnected = activeSocket.connected;

    eventHandlers.forEach((handler, eventName) => {
        activeSocket.on(eventName, handler);
    });

    const onConnect = () => {
        const reconnect = shouldRefreshAfterSocketConnect(
            hasConnected
        );
        hasConnected = true;
        onConnectionChange?.(true);
        if (reconnect) onReconnect?.();
    };
    const onDisconnect = () => onConnectionChange?.(false);

    activeSocket.on('connect', onConnect);
    activeSocket.on('disconnect', onDisconnect);
    onConnectionChange?.(activeSocket.connected);

    if (!activeSocket.connected) activeSocket.connect();

    return () => {
        if (disposed) return;
        disposed = true;
        eventHandlers.forEach((handler, eventName) => {
            activeSocket.off(eventName, handler);
        });
        activeSocket.off('connect', onConnect);
        activeSocket.off('disconnect', onDisconnect);
        subscribers = Math.max(0, subscribers - 1);
        if (subscribers === 0) activeSocket.disconnect();
    };
};

export const subscribeBoardRealtime = ({
    roomId,
    boardType,
    onInvalidate,
    onConnectionChange
}) => {
    let timer = null;
    let disposed = false;

    const schedule = (reason) => {
        if (disposed) return;
        clearTimeout(timer);
        timer = setTimeout(
            () => onInvalidate?.(reason),
            180
        );
    };

    const onBoardEvent = (payload) => {
        if (shouldInvalidateBoardEvent(payload, roomId, boardType)) {
            schedule(payload?.eventType);
        }
    };

    const eventHandlers = new Map(
        BOARD_EVENTS.map((eventName) => [eventName, onBoardEvent])
    );

    WORKFLOW_EVENTS.forEach((eventName) => {
        eventHandlers.set(eventName, (payload) => {
            if (shouldInvalidateWorkflowEvent(
                eventName,
                payload,
                roomId,
                boardType
            )) {
                schedule(eventName);
            }
        });
    });

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => schedule('socket:reconnect')
    });

    return () => {
        disposed = true;
        clearTimeout(timer);
        unsubscribe();
    };
};

export const subscribeTicketChatRealtime = ({
    ticketId,
    onInvalidate,
    onConnectionChange
}) => {
    let timer = null;
    let disposed = false;
    let latestPayload = null;

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

    const eventHandlers = new Map(
        CHAT_EVENTS.map((eventName) => [
            eventName,
            (payload) => {
                if (shouldInvalidateChatEvent(payload, ticketId)) {
                    schedule({ ...payload, eventType: eventName });
                }
            }
        ])
    );

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => schedule({
            ticketId,
            eventType: 'socket:reconnect'
        })
    });

    return () => {
        disposed = true;
        clearTimeout(timer);
        latestPayload = null;
        unsubscribe();
    };
};

export const subscribeAccessRequestRealtime = ({
    onInvalidate,
    onPermissionsUpdated,
    onConnectionChange
}) => {
    let timer = null;
    let disposed = false;
    let permissionsChanged = false;

    const schedule = (eventName, payload) => {
        if (disposed) return;
        permissionsChanged = permissionsChanged
            || eventName === 'permissions:updated';
        clearTimeout(timer);
        timer = setTimeout(() => {
            const refreshPermissions = permissionsChanged;
            permissionsChanged = false;
            onInvalidate?.({ eventType: eventName, ...payload });
            if (refreshPermissions) onPermissionsUpdated?.();
        }, 180);
    };

    const eventHandlers = new Map(
        ACCESS_REQUEST_EVENTS.map((eventName) => [
            eventName,
            (payload) => schedule(eventName, payload)
        ])
    );

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => schedule('socket:reconnect', {})
    });

    return () => {
        disposed = true;
        clearTimeout(timer);
        unsubscribe();
    };
};

export const subscribeOrganizationRealtime = ({
    onInvalidate,
    onConnectionChange
}) => {
    let timer = null;
    let disposed = false;

    const schedule = (eventName, payload = {}) => {
        if (disposed) return;
        clearTimeout(timer);
        timer = setTimeout(
            () => onInvalidate?.({ eventType: eventName, ...payload }),
            180
        );
    };

    const eventHandlers = new Map(
        ORGANIZATION_EVENTS.map((eventName) => [
            eventName,
            (payload) => schedule(eventName, payload)
        ])
    );

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => schedule('socket:reconnect')
    });

    return () => {
        disposed = true;
        clearTimeout(timer);
        unsubscribe();
    };
};

export const subscribeRoomSettingsRealtime = ({
    roomId,
    onInvalidate,
    onConnectionChange
}) => {
    const eventHandlers = new Map(
        SETTINGS_EVENTS.map((eventName) => [
            eventName,
            (payload) => {
                if (String(payload?.roomId) === String(roomId)) {
                    onInvalidate?.({ eventType: eventName, ...payload });
                }
            }
        ])
    );

    return createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => onInvalidate?.({
            eventType: 'socket:reconnect',
            roomId
        })
    });
};

export const subscribeSystemRealtime = ({
    onInvalidate,
    onConnectionChange
}) => {
    let timer = null;
    let disposed = false;

    const schedule = (eventName, payload = {}) => {
        if (disposed) return;
        clearTimeout(timer);
        timer = setTimeout(
            () => onInvalidate?.({ eventType: eventName, ...payload }),
            180
        );
    };

    const eventHandlers = new Map(
        SYSTEM_EVENTS.map((eventName) => [
            eventName,
            (payload) => schedule(eventName, payload)
        ])
    );

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => schedule('socket:reconnect')
    });

    return () => {
        disposed = true;
        clearTimeout(timer);
        unsubscribe();
    };
};

export const refreshBoardSocketAccess = () => {
    const activeSocket = getSocket();
    if (!activeSocket.connected) {
        activeSocket.connect();
        return;
    }
    activeSocket.disconnect();
    activeSocket.connect();
};

export const closeBoardSocket = () => {
    socket?.disconnect();
    socket = null;
    subscribers = 0;
};
