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
const ASSIGNMENT_EVENTS = ['assignment:updated'];
const USER_MANAGEMENT_EVENTS = ['user-management:updated'];

const SYSTEM_EVENTS = [
    ...ORGANIZATION_EVENTS,
    ...USER_MANAGEMENT_EVENTS,
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

const AUTH_EXPIRED_EVENT = 'tamar:socket-auth-expired';

let socket = null;
let subscribers = 0;
let authExpiryNotified = false;

const dispatchAuthExpired = (detail = {}) => {
    if (authExpiryNotified) return;
    authExpiryNotified = true;

    if (
        typeof window !== 'undefined'
        && typeof window.dispatchEvent === 'function'
    ) {
        window.dispatchEvent(
            new CustomEvent(
                AUTH_EXPIRED_EVENT,
                { detail }
            )
        );
    }
};

const getSocket = () => {
    if (socket) return socket;

    socket = io(socketUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        auth: async (callback) => {
            try {
                callback({
                    accessToken: await getAccessToken()
                });
            } catch {
                callback({});
            }
        }
    });

    socket.on('connect', () => {
        authExpiryNotified = false;
    });

    socket.on('auth:token-expired', (payload) => {
        dispatchAuthExpired({
            reason: 'token-expired',
            ...payload
        });
        socket?.disconnect();
    });

    socket.on('connect_error', (error) => {
        if (
            error?.message === 'AUTHENTICATION_REQUIRED'
            || error?.data?.code === 'AUTHENTICATION_REQUIRED'
        ) {
            dispatchAuthExpired({
                reason: 'authentication-required'
            });
            socket?.disconnect();
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

export const shouldRefreshAfterSocketConnect = (
    hasConnectedBefore
) => Boolean(hasConnectedBefore);

export const shouldInvalidateChatEvent = (
    payload,
    ticketId
) => (
    Boolean(ticketId)
    && String(payload?.ticketId) === String(ticketId)
);

export const shouldInvalidateAssignmentEvent = (
    payload,
    ticketId
) => (
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

    const onDisconnect = (reason) => {
        onConnectionChange?.(false, reason);
    };

    const onConnectError = (error) => {
        onConnectionChange?.(false, error?.message || 'connect_error');
    };

    activeSocket.on('connect', onConnect);
    activeSocket.on('disconnect', onDisconnect);
    activeSocket.on('connect_error', onConnectError);

    onConnectionChange?.(activeSocket.connected);

    if (!activeSocket.connected) {
        activeSocket.connect();
    }

    return () => {
        if (disposed) return;
        disposed = true;

        eventHandlers.forEach((handler, eventName) => {
            activeSocket.off(eventName, handler);
        });

        activeSocket.off('connect', onConnect);
        activeSocket.off('disconnect', onDisconnect);
        activeSocket.off('connect_error', onConnectError);

        subscribers = Math.max(0, subscribers - 1);

        if (subscribers === 0) {
            activeSocket.disconnect();
        }
    };
};

const createDebouncedSubscription = ({
    eventNames,
    matches = () => true,
    delay = 180,
    onInvalidate,
    onConnectionChange,
    reconnectPayload
}) => {
    let timer = null;
    let disposed = false;
    let latestPayload = null;

    const schedule = (eventName, payload = {}) => {
        if (disposed || !matches(payload)) return;

        latestPayload = {
            eventType: eventName,
            ...payload
        };

        clearTimeout(timer);
        timer = setTimeout(() => {
            const next = latestPayload;
            latestPayload = null;
            onInvalidate?.(next);
        }, delay);
    };

    const eventHandlers = new Map(
        eventNames.map((eventName) => [
            eventName,
            (payload) => schedule(eventName, payload)
        ])
    );

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => onInvalidate?.(
            typeof reconnectPayload === 'function'
                ? reconnectPayload()
                : {
                    eventType: 'socket:reconnect',
                    ...(reconnectPayload || {})
                }
        )
    });

    return () => {
        disposed = true;
        clearTimeout(timer);
        latestPayload = null;
        unsubscribe();
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
        if (
            shouldInvalidateBoardEvent(
                payload,
                roomId,
                boardType
            )
        ) {
            schedule(payload?.eventType);
        }
    };

    const eventHandlers = new Map(
        BOARD_EVENTS.map((eventName) => [
            eventName,
            onBoardEvent
        ])
    );

    WORKFLOW_EVENTS.forEach((eventName) => {
        eventHandlers.set(eventName, (payload) => {
            if (
                shouldInvalidateWorkflowEvent(
                    eventName,
                    payload,
                    roomId,
                    boardType
                )
            ) {
                schedule(eventName);
            }
        });
    });

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => schedule(
            'socket:reconnect'
        )
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
}) => createDebouncedSubscription({
    eventNames: CHAT_EVENTS,
    matches: (payload) => (
        shouldInvalidateChatEvent(
            payload,
            ticketId
        )
    ),
    onInvalidate,
    onConnectionChange,
    reconnectPayload: () => ({
        eventType: 'socket:reconnect',
        ticketId
    })
});

export const subscribeAssignmentRealtime = ({
    ticketId,
    onInvalidate,
    onConnectionChange
}) => createDebouncedSubscription({
    eventNames: ASSIGNMENT_EVENTS,
    matches: (payload) => (
        shouldInvalidateAssignmentEvent(
            payload,
            ticketId
        )
    ),
    delay: 120,
    onInvalidate,
    onConnectionChange,
    reconnectPayload: () => ({
        eventType: 'socket:reconnect',
        ticketId
    })
});

export const subscribeAccessRequestRealtime = ({
    onInvalidate,
    onPermissionsUpdated,
    onConnectionChange
}) => {
    let timer = null;
    let disposed = false;
    let latestPermissionPayload = null;
    let latestPayload = null;

    const schedule = (eventName, payload = {}) => {
        if (disposed) return;

        latestPayload = {
            eventType: eventName,
            ...payload
        };

        if (eventName === 'permissions:updated') {
            latestPermissionPayload = payload;
        }

        clearTimeout(timer);
        timer = setTimeout(() => {
            const nextPayload = latestPayload;
            const permissionsPayload = latestPermissionPayload;

            latestPayload = null;
            latestPermissionPayload = null;

            onInvalidate?.(nextPayload);

            if (permissionsPayload) {
                onPermissionsUpdated?.(
                    permissionsPayload
                );
            }
        }, 180);
    };

    const eventHandlers = new Map(
        ACCESS_REQUEST_EVENTS.map((eventName) => [
            eventName,
            (payload) => schedule(
                eventName,
                payload
            )
        ])
    );

    const unsubscribe = createSubscription({
        eventHandlers,
        onConnectionChange,
        onReconnect: () => schedule(
            'socket:reconnect',
            {}
        )
    });

    return () => {
        disposed = true;
        clearTimeout(timer);
        unsubscribe();
    };
};

export const subscribeUserManagementRealtime = ({
    onInvalidate,
    onConnectionChange
}) => createDebouncedSubscription({
    eventNames: USER_MANAGEMENT_EVENTS,
    onInvalidate,
    onConnectionChange
});

export const subscribeOrganizationRealtime = ({
    onInvalidate,
    onConnectionChange
}) => createDebouncedSubscription({
    eventNames: ORGANIZATION_EVENTS,
    onInvalidate,
    onConnectionChange
});

export const subscribeRoomSettingsRealtime = ({
    roomId,
    onInvalidate,
    onConnectionChange
}) => {
    let lastVersion = null;
    let lastUpdatedAt = null;

    return createDebouncedSubscription({
        eventNames: SETTINGS_EVENTS,
        matches: (payload) => {
            if (
                String(payload?.roomId)
                !== String(roomId)
            ) {
                return false;
            }

            const version = payload?.version ?? null;
            const updatedAt = payload?.updatedAt ?? null;

            if (
                version !== null
                && version === lastVersion
                && updatedAt === lastUpdatedAt
            ) {
                return false;
            }

            lastVersion = version;
            lastUpdatedAt = updatedAt;
            return true;
        },
        delay: 140,
        onInvalidate,
        onConnectionChange,
        reconnectPayload: () => ({
            eventType: 'socket:reconnect',
            roomId
        })
    });
};

export const subscribeSystemRealtime = ({
    onInvalidate,
    onConnectionChange
}) => createDebouncedSubscription({
    eventNames: SYSTEM_EVENTS,
    onInvalidate,
    onConnectionChange
});

export const refreshBoardSocketAccess = () => {
    const activeSocket = getSocket();

    if (activeSocket.connected) {
        activeSocket.disconnect();
    }

    if (subscribers > 0) {
        queueMicrotask(() => {
            activeSocket.connect();
        });
    }
};

export const closeBoardSocket = () => {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
    }

    socket = null;
    subscribers = 0;
    authExpiryNotified = false;
};

export const SOCKET_AUTH_EXPIRED_EVENT = AUTH_EXPIRED_EVENT;
