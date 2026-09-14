const {
    assertExactKeys, parsePositiveInteger, requireEnum, requireObjectId
} = require('../../../../validation/strictValidation.js');
const {
    BOARD_TYPE_VALUES, CATEGORY_MODES, PIN_MODES, TICKET_BOARD_TYPES
} = require('./board.constants.js');
const { boardError, validationError } = require('./board.errors.js');
const { TICKET_PRIORITY_VALUES } = require('../../domain/constants.js');
const {
    EXTERNAL_TRANSFER_STATE_VALUES, TRANSFER_STATUS_VALUES
} = require('../../transfers/domain/transfer.constants.js');

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;
const COLOR_PATTERN = /^#[0-9A-F]{6}$/u;
const DIRECTIONS = ['asc', 'desc'];
const BOOLEAN_TEXT = ['true', 'false'];

const normalizeCategoryName = (value) => {
    if (typeof value !== 'string') throw boardError(400, 'INVALID_CATEGORY_NAME', 'Category name must be text');
    const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
    if (!name || [...name].length > 100 || CONTROL_CHARACTERS.test(name)) {
        throw boardError(400, 'INVALID_CATEGORY_NAME', 'Category name must contain 1 to 100 valid characters');
    }
    return { name, normalizedName: name.toLocaleLowerCase('he-IL') };
};

const parseNullableText = (value, field, maxLength) => {
    if (value === null) return null;
    if (typeof value !== 'string') throw validationError(`${field} must be text or null`);
    const normalized = value.normalize('NFC').trim();
    if ([...normalized].length > maxLength || CONTROL_CHARACTERS.test(normalized)) {
        throw validationError(`${field} is invalid`);
    }
    return normalized || null;
};

const parseColor = (value) => {
    if (value === null) return null;
    if (typeof value !== 'string' || !COLOR_PATTERN.test(value.toUpperCase())) {
        throw boardError(400, 'INVALID_CATEGORY_COLOR', 'Category color must use #RRGGBB');
    }
    return value.toUpperCase();
};

const parseBoolean = (value, field, fallback) => {
    if (value === undefined) return fallback;
    if (!BOOLEAN_TEXT.includes(String(value))) throw validationError(`${field} must be true or false`);
    return String(value) === 'true';
};

const parseDate = (value, field) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/u.test(value)) {
        throw boardError(400, 'INVALID_BOARD_QUERY', `${field} must be an ISO date`);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw boardError(400, 'INVALID_BOARD_QUERY', `${field} must be an ISO date`);
    return date;
};

const parseSearch = (value) => {
    if (value === undefined) return '';
    if (typeof value !== 'string') throw boardError(400, 'INVALID_BOARD_QUERY', 'search must be text');
    const search = value.normalize('NFC').trim();
    if ([...search].length > 100 || CONTROL_CHARACTERS.test(search)) {
        throw boardError(400, 'INVALID_BOARD_QUERY', 'search is invalid');
    }
    return search;
};

const parseExpectedVersion = (request, target) => {
    const value = request.get('If-Match');
    if (!value) throw boardError(428, 'PRECONDITION_REQUIRED', 'If-Match is required');
    const match = /^(?:W\/)?(?:"(\d+)"|(\d+))$/u.exec(value.trim());
    if (!match) throw validationError('If-Match must contain a numeric version');
    const version = Number(match[1] || match[2]);
    if (!Number.isSafeInteger(version) || (target === 'category' && version < 1)) {
        throw validationError('If-Match version is invalid');
    }
    return version;
};

const parseBoardParams = (request, _response, next) => {
    try {
        request.boardParams = {
            roomId: requireObjectId(request.params.roomId, 'roomId'),
            boardType: requireEnum(request.params.boardType, 'boardType', BOARD_TYPE_VALUES)
        };
        next();
    } catch (error) {
        if (error.code === 'VALIDATION_ERROR' && request.params.boardType
            && !BOARD_TYPE_VALUES.includes(request.params.boardType)) {
            next(boardError(400, 'BOARD_TYPE_INVALID', 'Board type is invalid'));
            return;
        }
        next(error);
    }
};

const parseCategoryId = (request, _response, next) => {
    try { request.categoryId = requireObjectId(request.params.categoryId, 'categoryId'); next(); }
    catch (error) { next(error); }
};

const parseItemId = (request, _response, next) => {
    try { request.itemId = requireObjectId(request.params.itemId, 'itemId'); next(); }
    catch (error) { next(error); }
};

const parseCategoryBody = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['name', 'description', 'color']);
        const update = {};
        if (Object.hasOwn(request.body, 'name')) Object.assign(update, normalizeCategoryName(request.body.name));
        if (Object.hasOwn(request.body, 'description')) update.description = parseNullableText(request.body.description, 'description', 500);
        if (Object.hasOwn(request.body, 'color')) update.color = parseColor(request.body.color);
        request.categoryInput = update;
        next();
    } catch (error) { next(error); }
};

const requireCategoryCreateFields = (request, _response, next) => {
    try {
        if (!Object.hasOwn(request.categoryInput, 'name')) throw boardError(400, 'INVALID_CATEGORY_NAME', 'Category name is required');
        request.categoryInput.description ??= null;
        request.categoryInput.color ??= null;
        next();
    } catch (error) { next(error); }
};

const rejectEmptyCategoryUpdate = (request, _response, next) => {
    if (!Object.keys(request.categoryInput).length) {
        next(boardError(400, 'EMPTY_CATEGORY_UPDATE', 'Category update must contain a change'));
        return;
    }
    next();
};

const parseEmptyBody = (request, _response, next) => {
    try { assertExactKeys(request.body ?? {}, []); next(); } catch (error) { next(error); }
};

const parseCategoryIfMatch = (request, _response, next) => {
    try { request.expectedCategoryVersion = parseExpectedVersion(request, 'category'); next(); }
    catch (error) { next(error); }
};

const parseStateIfMatch = (request, _response, next) => {
    try { request.expectedBoardStateVersion = parseExpectedVersion(request, 'state'); next(); }
    catch (error) { next(error); }
};

const parseStateBody = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['categoryId', 'isPinned']);
        const input = {};
        if (Object.hasOwn(request.body, 'categoryId')) {
            input.categoryId = request.body.categoryId === null
                ? null : requireObjectId(request.body.categoryId, 'categoryId');
        }
        if (Object.hasOwn(request.body, 'isPinned')) {
            if (typeof request.body.isPinned !== 'boolean') throw validationError('isPinned must be a boolean');
            input.isPinned = request.body.isPinned;
        }
        if (!Object.keys(input).length) throw boardError(400, 'EMPTY_BOARD_STATE_UPDATE', 'Board state update must contain a change');
        request.boardStateInput = input;
        next();
    } catch (error) { next(error); }
};

const parseCategoryListQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, ['page', 'limit', 'search', 'includeArchived', 'sortBy', 'sortDirection'], 'query');
        request.categoryQuery = {
            page: parsePositiveInteger(request.query.page, 'page', 1, Number.MAX_SAFE_INTEGER),
            limit: parsePositiveInteger(request.query.limit, 'limit', 100, 100),
            search: parseSearch(request.query.search),
            includeArchived: parseBoolean(request.query.includeArchived, 'includeArchived', false),
            sortBy: request.query.sortBy === undefined ? 'name' : requireEnum(request.query.sortBy, 'sortBy', ['name', 'createdAt', 'updatedAt']),
            sortDirection: request.query.sortDirection === undefined ? 'asc' : requireEnum(request.query.sortDirection, 'sortDirection', DIRECTIONS)
        };
        next();
    } catch (error) { next(error); }
};

const parseBoardListQuery = (request, _response, next) => {
    try {
        const common = ['page', 'limit', 'search', 'categoryId', 'categoryMode', 'pinMode', 'sortBy', 'sortDirection'];
        const ticket = ['priority', 'createdBy', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'closedFrom', 'closedTo'];
        const external = ['transferStatus', 'externalState', 'initiatedFrom', 'initiatedTo', 'resolvedFrom', 'resolvedTo'];
        const ticketBoard = TICKET_BOARD_TYPES.includes(request.boardParams.boardType);
        assertExactKeys(request.query, [...common, ...(ticketBoard ? ticket : external)], 'query');
        const categoryMode = request.query.categoryMode === undefined ? 'ALL'
            : requireEnum(request.query.categoryMode, 'categoryMode', CATEGORY_MODES);
        const query = {
            page: parsePositiveInteger(request.query.page, 'page', 1, Number.MAX_SAFE_INTEGER),
            limit: parsePositiveInteger(request.query.limit, 'limit', 25, 100),
            search: parseSearch(request.query.search),
            categoryId: request.query.categoryId === undefined ? null : requireObjectId(request.query.categoryId, 'categoryId'),
            categoryMode,
            pinMode: request.query.pinMode === undefined ? 'ALL' : requireEnum(request.query.pinMode, 'pinMode', PIN_MODES),
            sortDirection: request.query.sortDirection === undefined ? 'desc' : requireEnum(request.query.sortDirection, 'sortDirection', DIRECTIONS)
        };
        if (query.categoryId && categoryMode === 'UNCATEGORIZED') {
            throw boardError(400, 'INVALID_BOARD_QUERY', 'categoryId cannot be combined with UNCATEGORIZED');
        }
        if (ticketBoard) {
            query.sortBy = request.query.sortBy === undefined
                ? (request.boardParams.boardType === 'CLOSED' ? 'closedAt' : 'updatedAt')
                : requireEnum(request.query.sortBy, 'sortBy', ['updatedAt', 'createdAt', 'closedAt', 'priority', 'ticketNumber', 'sequenceNumber', 'pinnedAt']);
            if (request.boardParams.boardType === 'OPEN' && (request.query.closedFrom || request.query.closedTo || query.sortBy === 'closedAt')) {
                throw boardError(400, 'INVALID_BOARD_QUERY', 'Closed filters are invalid for OPEN board');
            }
            if (request.query.priority) query.priority = requireEnum(request.query.priority, 'priority', TICKET_PRIORITY_VALUES);
            if (request.query.createdBy) query.createdBy = requireObjectId(request.query.createdBy, 'createdBy');
            for (const key of ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'closedFrom', 'closedTo']) query[key] = parseDate(request.query[key], key);
            for (const [from, to] of [['createdFrom', 'createdTo'], ['updatedFrom', 'updatedTo'], ['closedFrom', 'closedTo']]) {
                if (query[from] && query[to] && query[from] > query[to]) throw boardError(400, 'INVALID_BOARD_QUERY', `${from} must precede ${to}`);
            }
        } else {
            query.sortBy = request.query.sortBy === undefined ? 'initiatedAt'
                : requireEnum(request.query.sortBy, 'sortBy', ['initiatedAt', 'acceptedAt', 'cancelledAt', 'updatedAt', 'ticketNumber', 'sequence', 'pinnedAt']);
            if (request.query.transferStatus) query.transferStatus = requireEnum(request.query.transferStatus, 'transferStatus', TRANSFER_STATUS_VALUES);
            if (request.query.externalState) query.externalState = requireEnum(request.query.externalState, 'externalState', EXTERNAL_TRANSFER_STATE_VALUES);
            for (const key of ['initiatedFrom', 'initiatedTo', 'resolvedFrom', 'resolvedTo']) query[key] = parseDate(request.query[key], key);
            for (const [from, to] of [['initiatedFrom', 'initiatedTo'], ['resolvedFrom', 'resolvedTo']]) {
                if (query[from] && query[to] && query[from] > query[to]) throw boardError(400, 'INVALID_BOARD_QUERY', `${from} must precede ${to}`);
            }
        }
        request.boardQuery = query;
        next();
    } catch (error) {
        if (error.code === 'VALIDATION_ERROR') next(boardError(400, 'INVALID_BOARD_QUERY', error.message, error.fieldErrors));
        else next(error);
    }
};

module.exports = {
    normalizeCategoryName,
    parseBoardListQuery,
    parseBoardParams,
    parseCategoryBody,
    parseCategoryId,
    parseCategoryIfMatch,
    parseCategoryListQuery,
    parseEmptyBody,
    parseItemId,
    parseStateBody,
    parseStateIfMatch,
    rejectEmptyCategoryUpdate,
    requireCategoryCreateFields
};
