const {
    assertExactKeys, optionalObjectId, parsePositiveInteger, requireEnum, requireObjectId, requireString, validationError
} = require('../../../validation/strictValidation.js');
const { sanitizeFieldValues } = require('../domain/fieldValues.js');
const {
    TICKET_PRIORITIES, TICKET_PRIORITY_VALUES, TICKET_SORT_FIELDS, TICKET_VIEWS, TICKET_VIEW_VALUES
} = require('../domain/constants.js');
const { ticketError } = require('../domain/errors.js');

const LIST_QUERY_KEYS = [
    'view', 'page', 'limit', 'search', 'systemId', 'environmentId', 'subEnvironmentId', 'roomId',
    'priority', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'closedFrom', 'closedTo',
    'createdBy', 'customerId', 'sortBy', 'sortDirection'
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const parseDate = (value, name) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
        throw ticketError(400, 'INVALID_TICKET_QUERY', `${name} must be a strict ISO-8601 UTC date`);
    }
    return new Date(value);
};
const assertRange = (from, to, name) => {
    if (from && to && from > to) throw ticketError(400, 'INVALID_TICKET_QUERY', `${name} date range is inverted`);
};
const parsePriority = (value) => {
    if (!TICKET_PRIORITY_VALUES.includes(value)) {
        throw ticketError(400, 'INVALID_TICKET_PRIORITY', 'Ticket priority is invalid', { priority: 'Unsupported value' });
    }
    return value;
};
const parseTicketId = (request, _response, next) => {
    try { request.ticketId = requireObjectId(request.params.id, 'id'); next(); } catch (error) { next(error); }
};
const parseIfMatch = (request, _response, next) => {
    try {
        const value = request.get('If-Match');
        if (!value) throw ticketError(428, 'PRECONDITION_REQUIRED', 'If-Match is required');
        const match = /^(?:"([1-9]\d*)"|([1-9]\d*))$/.exec(value.trim());
        if (!match) throw validationError('If-Match must contain a positive ticket version');
        request.expectedTicketVersion = Number(match[1] || match[2]);
        next();
    } catch (error) { next(error); }
};
const parseCreateTicket = (request, _response, next) => {
    try {
        if (request.body && typeof request.body === 'object' && Object.hasOwn(request.body, 'status')) {
            throw ticketError(400, 'INVALID_TICKET_STATUS', 'Ticket status cannot be supplied during creation');
        }
        assertExactKeys(request.body, ['roomId', 'subject', 'description', 'priority', 'fieldValues']);
        request.ticketInput = {
            roomId: requireObjectId(request.body.roomId, 'roomId'),
            subject: requireString(request.body.subject, 'subject', { maxLength: 200 }),
            description: requireString(request.body.description, 'description', { maxLength: 20000 }),
            priority: request.body.priority === undefined ? TICKET_PRIORITIES.MEDIUM : parsePriority(request.body.priority),
            fieldValues: sanitizeFieldValues(request.body.fieldValues)
        };
        if (request.ticketInput.subject.length < 3) throw validationError('subject must contain at least 3 characters');
        next();
    } catch (error) { next(error); }
};
const parseUpdateTicket = (request, _response, next) => {
    try {
        if (request.body && typeof request.body === 'object' && Object.hasOwn(request.body, 'status')) {
            throw ticketError(400, 'INVALID_TICKET_STATUS', 'Ticket status can change only through the close operation');
        }
        assertExactKeys(request.body, ['subject', 'description', 'priority', 'fieldValues']);
        if (!Object.keys(request.body).length) throw ticketError(400, 'EMPTY_UPDATE', 'At least one ticket field is required');
        request.ticketInput = {};
        if (request.body.subject !== undefined) {
            request.ticketInput.subject = requireString(request.body.subject, 'subject', { maxLength: 200 });
            if (request.ticketInput.subject.length < 3) throw validationError('subject must contain at least 3 characters');
        }
        if (request.body.description !== undefined) request.ticketInput.description = requireString(request.body.description, 'description', { maxLength: 20000 });
        if (request.body.priority !== undefined) request.ticketInput.priority = parsePriority(request.body.priority);
        if (request.body.fieldValues !== undefined) request.ticketInput.fieldValues = sanitizeFieldValues(request.body.fieldValues);
        next();
    } catch (error) { next(error); }
};
const parseCloseTicket = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['closureSummary']);
        const closureSummary = requireString(request.body.closureSummary, 'closureSummary', { maxLength: 5000 });
        if (closureSummary.length < 3) throw validationError('closureSummary must contain at least 3 characters');
        request.ticketInput = { closureSummary };
        next();
    } catch (error) { next(error); }
};
const parseTicketListQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, LIST_QUERY_KEYS, 'query');
        const view = request.query.view === undefined ? TICKET_VIEWS.OPEN : requireEnum(request.query.view, 'view', TICKET_VIEW_VALUES);
        const defaultSort = view === TICKET_VIEWS.HISTORY ? 'closedAt' : 'updatedAt';
        const query = {
            view,
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 25, 100),
            search: request.query.search === undefined ? undefined : requireString(request.query.search, 'search', { maxLength: 100 }),
            systemId: optionalObjectId(request.query.systemId, 'systemId'),
            environmentId: optionalObjectId(request.query.environmentId, 'environmentId'),
            subEnvironmentId: optionalObjectId(request.query.subEnvironmentId, 'subEnvironmentId'),
            roomId: optionalObjectId(request.query.roomId, 'roomId'),
            createdBy: optionalObjectId(request.query.createdBy, 'createdBy'),
            customerId: request.query.customerId === undefined
                ? undefined
                : requireString(request.query.customerId, 'customerId', { maxLength: 128 }),
            priority: request.query.priority === undefined ? undefined : parsePriority(request.query.priority),
            sortBy: request.query.sortBy === undefined ? defaultSort : requireEnum(request.query.sortBy, 'sortBy', TICKET_SORT_FIELDS),
            sortDirection: request.query.sortDirection === undefined ? 'desc' : requireEnum(request.query.sortDirection, 'sortDirection', ['asc', 'desc'])
        };
        for (const key of ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'closedFrom', 'closedTo']) query[key] = parseDate(request.query[key], key);
        assertRange(query.createdFrom, query.createdTo, 'created');
        assertRange(query.updatedFrom, query.updatedTo, 'updated');
        assertRange(query.closedFrom, query.closedTo, 'closed');
        request.ticketQuery = query;
        next();
    } catch (error) {
        if (error?.code === 'VALIDATION_ERROR') error.code = 'INVALID_TICKET_QUERY';
        next(error);
    }
};
const parseTicketHistoryQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, ['page', 'limit', 'sortDirection'], 'query');
        request.ticketQuery = {
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 50, 100),
            sortDirection: request.query.sortDirection === undefined ? 'asc' : requireEnum(request.query.sortDirection, 'sortDirection', ['asc', 'desc'])
        };
        next();
    } catch (error) {
        if (error?.code === 'VALIDATION_ERROR') error.code = 'INVALID_TICKET_QUERY';
        next(error);
    }
};

module.exports = { parseTicketId, parseIfMatch, parseCreateTicket, parseUpdateTicket, parseCloseTicket, parseTicketListQuery, parseTicketHistoryQuery };
