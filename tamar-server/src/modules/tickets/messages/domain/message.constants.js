const MESSAGE_LIMITS = Object.freeze({
    CONTENT_CHARACTERS: 10_000,
    CONTENT_BYTES: 40_000,
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    MAX_CURSOR_LENGTH: 512
});

const MESSAGE_EVENTS = Object.freeze({
    CREATED: 'chat:message-created',
    UPDATED: 'chat:message-updated',
    DELETED: 'chat:message-deleted'
});

const CLIENT_MESSAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

module.exports = { CLIENT_MESSAGE_ID_PATTERN, MESSAGE_EVENTS, MESSAGE_LIMITS };
