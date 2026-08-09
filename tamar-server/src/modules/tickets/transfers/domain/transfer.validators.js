const {
    assertExactKeys, optionalObjectId, parsePositiveInteger, requireEnum, requireObjectId, requireString
} = require('../../../../validation/strictValidation.js');
const { transferError } = require('./transfer.errors.js');
const {
    EXTERNAL_TRANSFER_STATE_VALUES,
    TRANSFER_DIRECTION_VALUES,
    TRANSFER_SORT_FIELDS,
    TRANSFER_STATUS_VALUES
} = require('./transfer.constants.js');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const LIST_KEYS = [
    'direction', 'status', 'externalState', 'page', 'limit', 'search', 'ticketId', 'sourceRoomId',
    'destinationRoomId', 'sourceSubEnvironmentId', 'destinationSubEnvironmentId', 'initiatedFrom',
    'initiatedTo', 'resolvedFrom', 'resolvedTo', 'sortBy', 'sortDirection'
];

const parseDate = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
        throw transferError(400, 'INVALID_TRANSFER_QUERY', `${name} must be a strict ISO-8601 UTC date`);
    }
    return new Date(value);
};
const assertRange = (from, to, name) => {
    if (from && to && from > to) throw transferError(400, 'INVALID_TRANSFER_QUERY', `${name} date range is inverted`);
};
const strictReason = (value, name, code) => {
    let reason;
    try { reason = requireString(value, name, { maxLength: 5000 }); }
    catch (error) {
        if (error?.code === 'VALIDATION_ERROR') throw transferError(400, code, `${name} is invalid`, error.fieldErrors);
        throw error;
    }
    if (reason.length < 3) throw transferError(400, code, `${name} must contain at least 3 characters`);
    return reason;
};
const safeSearch = (value) => {
    if (value === undefined) return undefined;
    const normalized = requireString(value, 'search', { maxLength: 100 });
    if (/[\u0000-\u001F\u007F]/u.test(normalized)) throw transferError(400, 'INVALID_TRANSFER_QUERY', 'search contains control characters');
    return normalized;
};

const parseTransferId = (request, _response, next) => {
    try { request.transferId = requireObjectId(request.params.id, 'id'); next(); } catch (error) { next(error); }
};
const parseInitiateTransfer = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['destinationRoomId', 'reason']);
        request.transferInput = {
            destinationRoomId: requireObjectId(request.body.destinationRoomId, 'destinationRoomId'),
            reason: strictReason(request.body.reason, 'reason', 'INVALID_TRANSFER_REASON')
        };
        next();
    } catch (error) { next(error); }
};
const parseCancelTransfer = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['reason']);
        request.transferInput = { reason: strictReason(request.body.reason, 'reason', 'INVALID_CANCELLATION_REASON') };
        next();
    } catch (error) { next(error); }
};
const parseAcceptTransfer = (request, _response, next) => {
    try {
        const body = request.body === undefined ? {} : request.body;
        assertExactKeys(body, []);
        request.transferInput = {};
        next();
    } catch (error) { next(error); }
};
const parseTransferListQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, LIST_KEYS, 'query');
        const query = {
            direction: request.query.direction === undefined ? 'INCOMING' : requireEnum(request.query.direction, 'direction', TRANSFER_DIRECTION_VALUES),
            status: request.query.status === undefined ? undefined : requireEnum(request.query.status, 'status', TRANSFER_STATUS_VALUES),
            externalState: request.query.externalState === undefined ? undefined : requireEnum(request.query.externalState, 'externalState', EXTERNAL_TRANSFER_STATE_VALUES),
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 25, 100),
            search: safeSearch(request.query.search),
            ticketId: optionalObjectId(request.query.ticketId, 'ticketId'),
            sourceRoomId: optionalObjectId(request.query.sourceRoomId, 'sourceRoomId'),
            destinationRoomId: optionalObjectId(request.query.destinationRoomId, 'destinationRoomId'),
            sourceSubEnvironmentId: optionalObjectId(request.query.sourceSubEnvironmentId, 'sourceSubEnvironmentId'),
            destinationSubEnvironmentId: optionalObjectId(request.query.destinationSubEnvironmentId, 'destinationSubEnvironmentId'),
            sortBy: request.query.sortBy === undefined ? 'initiatedAt' : requireEnum(request.query.sortBy, 'sortBy', TRANSFER_SORT_FIELDS),
            sortDirection: request.query.sortDirection === undefined ? 'desc' : requireEnum(request.query.sortDirection, 'sortDirection', ['asc', 'desc'])
        };
        for (const key of ['initiatedFrom', 'initiatedTo', 'resolvedFrom', 'resolvedTo']) query[key] = parseDate(request.query[key], key);
        assertRange(query.initiatedFrom, query.initiatedTo, 'initiated');
        assertRange(query.resolvedFrom, query.resolvedTo, 'resolved');
        request.transferQuery = query;
        next();
    } catch (error) {
        if (error?.code === 'VALIDATION_ERROR') error.code = 'INVALID_TRANSFER_QUERY';
        next(error);
    }
};
const parseTransferHistoryQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, ['page', 'limit', 'sortDirection'], 'query');
        request.transferQuery = {
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 50, 100),
            sortDirection: request.query.sortDirection === undefined ? 'asc' : requireEnum(request.query.sortDirection, 'sortDirection', ['asc', 'desc'])
        };
        next();
    } catch (error) {
        if (error?.code === 'VALIDATION_ERROR') error.code = 'INVALID_TRANSFER_QUERY';
        next(error);
    }
};
const parseTransferTargetsQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, ['page', 'limit', 'search', 'environmentId', 'subEnvironmentId'], 'query');
        request.transferQuery = {
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 25, 100),
            search: safeSearch(request.query.search),
            environmentId: optionalObjectId(request.query.environmentId, 'environmentId'),
            subEnvironmentId: optionalObjectId(request.query.subEnvironmentId, 'subEnvironmentId')
        };
        next();
    } catch (error) {
        if (error?.code === 'VALIDATION_ERROR') error.code = 'INVALID_TRANSFER_QUERY';
        next(error);
    }
};

module.exports = {
    parseAcceptTransfer,
    parseCancelTransfer,
    parseInitiateTransfer,
    parseTransferHistoryQuery,
    parseTransferId,
    parseTransferListQuery,
    parseTransferTargetsQuery
};
