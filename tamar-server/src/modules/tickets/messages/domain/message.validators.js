const {
    assertExactKeys, parsePositiveInteger, requireObjectId
} = require('../../../../validation/strictValidation.js');
const { CLIENT_MESSAGE_ID_PATTERN, MESSAGE_LIMITS } = require('./message.constants.js');
const { decodeMessageCursor } = require('./message.cursor.js');
const { messageError } = require('./message.errors.js');

const DISALLOWED_CONTROLS = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/u;

const normalizeMessageContent = (value) => {
    if (typeof value !== 'string') {
        throw messageError(400, 'INVALID_MESSAGE_CONTENT', 'Message content must be plain text');
    }
    const normalized = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
    if (!normalized || [...normalized].length > MESSAGE_LIMITS.CONTENT_CHARACTERS
        || Buffer.byteLength(normalized, 'utf8') > MESSAGE_LIMITS.CONTENT_BYTES
        || DISALLOWED_CONTROLS.test(normalized)) {
        throw messageError(400, 'INVALID_MESSAGE_CONTENT', 'Message content is invalid or exceeds its limit');
    }
    return normalized;
};

const normalizeClientMessageId = (value) => {
    if (typeof value !== 'string' || !CLIENT_MESSAGE_ID_PATTERN.test(value)) {
        throw messageError(400, 'INVALID_CLIENT_MESSAGE_ID', 'clientMessageId must be a canonical UUID v4');
    }
    return value;
};

const parseMessageId = (request, _response, next) => {
    try { request.messageId = requireObjectId(request.params.messageId, 'messageId'); next(); }
    catch (error) { next(error); }
};

const parseMessageIfMatch = (request, _response, next) => {
    try {
        const value = request.get('If-Match');
        if (!value) throw messageError(428, 'PRECONDITION_REQUIRED', 'If-Match is required');
        const match = /^(?:"([1-9]\d*)"|([1-9]\d*))$/.exec(value.trim());
        if (!match) throw messageError(400, 'VALIDATION_ERROR', 'If-Match must contain a positive message version');
        request.expectedMessageVersion = Number(match[1] || match[2]);
        next();
    } catch (error) { next(error); }
};

const parseCreateMessage = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['clientMessageId', 'content']);
        request.messageInput = {
            clientMessageId: normalizeClientMessageId(request.body.clientMessageId),
            content: normalizeMessageContent(request.body.content)
        };
        next();
    } catch (error) { next(error); }
};

const parseEditMessage = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['content']);
        request.messageInput = { content: normalizeMessageContent(request.body.content) };
        next();
    } catch (error) { next(error); }
};

const parseDeleteMessage = (request, _response, next) => {
    try {
        assertExactKeys(request.body === undefined ? {} : request.body, []);
        request.messageInput = {};
        next();
    } catch (error) { next(error); }
};

const parseMessageListQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, ['limit', 'before'], 'query');
        request.messageQuery = {
            limit: parsePositiveInteger(
                request.query.limit,
                'limit',
                MESSAGE_LIMITS.DEFAULT_PAGE_SIZE,
                MESSAGE_LIMITS.MAX_PAGE_SIZE
            ),
            before: request.query.before === undefined ? null : decodeMessageCursor(request.query.before)
        };
        next();
    } catch (error) { next(error); }
};

module.exports = {
    normalizeClientMessageId,
    normalizeMessageContent,
    parseCreateMessage,
    parseDeleteMessage,
    parseEditMessage,
    parseMessageId,
    parseMessageIfMatch,
    parseMessageListQuery
};
