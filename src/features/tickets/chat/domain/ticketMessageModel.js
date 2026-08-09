export const MESSAGE_LIMIT = 50;
export const MESSAGE_MAX_LENGTH = 10000;
export const MESSAGE_MAX_BYTES = 40000;
export const MAX_REALTIME_REFRESH_PAGES = 4;

export const formatMessageEtag = (version) => `"${Math.max(1, Number(version) || 1)}"`;

export const adaptTicketMessage = (message, messageEtag = null) => {
    const isDeleted = Boolean(message?.isDeleted);
    return {
        id: String(message?.id || ''),
        ticketId: String(message?.ticketId || ''),
        author: {
            id: String(message?.author?.id || ''),
            displayName: message?.author?.displayName || 'משתמש לא מזוהה',
            email: message?.author?.email || null
        },
        content: isDeleted ? null : String(message?.content || ''),
        isEdited: Boolean(message?.isEdited),
        editedAt: message?.editedAt || null,
        isDeleted,
        deletedAt: message?.deletedAt || null,
        messageVersion: Math.max(1, Number(message?.version) || 1),
        messageEtag: messageEtag || formatMessageEtag(message?.version),
        createdAt: message?.createdAt || null,
        updatedAt: message?.updatedAt || null,
        capabilities: {
            canEdit: !isDeleted && Boolean(message?.capabilities?.canEdit),
            canDelete: !isDeleted && Boolean(message?.capabilities?.canDelete)
        }
    };
};

const compareMessages = (left, right) => {
    const timeDifference = new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
    return timeDifference || left.id.localeCompare(right.id);
};

export const mergeTicketMessages = (current, incoming) => {
    const byId = new Map((current || []).map((message) => [message.id, message]));
    for (const message of incoming || []) {
        const previous = byId.get(message.id);
        if (!previous || message.messageVersion >= previous.messageVersion) byId.set(message.id, message);
    }
    return [...byId.values()].sort(compareMessages);
};

export const replaceTicketMessage = (messages, nextMessage) => mergeTicketMessages(
    (messages || []).filter((message) => message.id !== nextMessage.id),
    [nextMessage]
);

export const normalizeMessageContent = (value) => String(value ?? '')
    .replace(/\r\n?/gu, '\n')
    .trim();

export const validateMessageContent = (value) => {
    const content = normalizeMessageContent(value);
    if (!content) return { valid: false, content, message: 'יש לכתוב תוכן להודעה.' };
    if (content.length > MESSAGE_MAX_LENGTH || new TextEncoder().encode(content).length > MESSAGE_MAX_BYTES) {
        return { valid: false, content, message: `ההודעה ארוכה מדי. ניתן לכתוב עד ${MESSAGE_MAX_LENGTH.toLocaleString('he-IL')} תווים.` };
    }
    return { valid: true, content, message: '' };
};

export const isCanonicalUuidV4 = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);

export const createClientMessageId = () => {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    if (typeof globalThis.crypto?.getRandomValues !== 'function') {
        throw new Error('Secure UUID generation is unavailable');
    }
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const pagesToRefresh = (loadedMessages) => Math.min(
    MAX_REALTIME_REFRESH_PAGES,
    Math.max(1, Math.ceil((loadedMessages || 0) / MESSAGE_LIMIT))
);

export const isNearConversationBottom = (element, threshold = 72) => (
    !element || element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
);
