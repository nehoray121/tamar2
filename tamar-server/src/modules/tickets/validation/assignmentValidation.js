const {
    assertExactKeys, parsePositiveInteger, requireEnum, requireObjectId, requireString
} = require('../../../validation/strictValidation.js');
const {
    ASSIGNMENT_HISTORY_VIEWS, ASSIGNMENT_HISTORY_VIEW_VALUES, ASSIGNMENT_LIMITS,
    BULK_ASSIGNMENT_OPERATIONS, BULK_ASSIGNMENT_OPERATION_VALUES
} = require('../domain/assignmentConstants.js');
const { ticketError, validationError } = require('../domain/errors.js');

const requireArray = (value, name, maxLength, { allowEmpty = true } = {}) => {
    if (!Array.isArray(value)) throw validationError(`${name} must be an array`, { [name]: 'Array required' });
    if ((!allowEmpty && value.length === 0) || value.length > maxLength) {
        throw ticketError(400, name === 'tickets' ? 'BULK_ASSIGNMENT_LIMIT_EXCEEDED' : 'VALIDATION_ERROR', `${name} is out of range`);
    }
    return value;
};

const parseAssigneeIds = (value, { allowEmpty = true } = {}) => {
    const values = requireArray(value, 'assigneeIds', ASSIGNMENT_LIMITS.ASSIGNEES, { allowEmpty });
    return [...new Set(values.map((item, index) => requireObjectId(item, `assigneeIds[${index}]`)))];
};

const parseBoolean = (value, name, fallback) => {
    if (value === undefined) return fallback;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw validationError(`${name} must be true or false`);
};

const parseReplaceAssignees = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['assigneeIds']);
        request.assignmentInput = { assigneeIds: parseAssigneeIds(request.body.assigneeIds) };
        next();
    } catch (error) { next(error); }
};

const parseAssignableUsersQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, ['page', 'limit', 'search', 'includeAssigned'], 'query');
        request.assignmentQuery = {
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 25, 100),
            search: request.query.search === undefined
                ? undefined
                : requireString(request.query.search, 'search', { maxLength: 100 }),
            includeAssigned: parseBoolean(request.query.includeAssigned, 'includeAssigned', true)
        };
        next();
    } catch (error) { next(error); }
};

const parseAssignmentsQuery = (request, _response, next) => {
    try {
        assertExactKeys(request.query, ['view', 'page', 'limit', 'sortDirection'], 'query');
        request.assignmentQuery = {
            view: request.query.view === undefined
                ? ASSIGNMENT_HISTORY_VIEWS.ALL
                : requireEnum(request.query.view, 'view', ASSIGNMENT_HISTORY_VIEW_VALUES),
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 50, 100),
            sortDirection: request.query.sortDirection === undefined
                ? 'asc'
                : requireEnum(request.query.sortDirection, 'sortDirection', ['asc', 'desc'])
        };
        next();
    } catch (error) { next(error); }
};

const parseBulkAssignees = (request, _response, next) => {
    try {
        assertExactKeys(request.body, ['operation', 'tickets', 'assigneeIds']);
        const operation = requireEnum(request.body.operation, 'operation', BULK_ASSIGNMENT_OPERATION_VALUES);
        const tickets = requireArray(request.body.tickets, 'tickets', ASSIGNMENT_LIMITS.BULK_TICKETS, { allowEmpty: false })
            .map((item, index) => {
                assertExactKeys(item, ['ticketId', 'expectedVersion'], `tickets[${index}]`);
                const expectedVersion = item.expectedVersion;
                if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
                    throw validationError(`tickets[${index}].expectedVersion must be a positive integer`);
                }
                return {
                    ticketId: requireObjectId(item.ticketId, `tickets[${index}].ticketId`),
                    expectedVersion
                };
            });
        if (new Set(tickets.map((item) => item.ticketId)).size !== tickets.length) {
            throw validationError('tickets contains duplicate ticketId values');
        }
        const assigneeIds = parseAssigneeIds(request.body.assigneeIds, {
            allowEmpty: operation === BULK_ASSIGNMENT_OPERATIONS.REPLACE
        });
        request.assignmentInput = { operation, tickets, assigneeIds };
        next();
    } catch (error) { next(error); }
};

module.exports = { parseReplaceAssignees, parseAssignableUsersQuery, parseAssignmentsQuery, parseBulkAssignees };
