const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const AppError = require('../errors/AppError.js');
const { assertExactKeys, optionalObjectId, requireString } = require('../validation/strictValidation.js');

// tamar-dashboard-group-field-query:v1
const parseGroupField = (value) => {
    if (value === undefined) return undefined;
    const field = requireString(value, 'groupField', { maxLength: 128 });
    if (!/^[A-Za-z0-9_-]+$/u.test(field)) {
        throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'groupField is invalid' });
    }
    return field;
};

const parseDate = (value, field, endOfDay = false) => {
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
        throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: `${field} must use YYYY-MM-DD` });
    }
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    if (Number.isNaN(date.getTime())) throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: `${field} is invalid` });
    return date;
};

const parseQuery = (query) => {
    assertExactKeys(query, ['systemId', 'environmentId', 'subEnvironmentId', 'roomId', 'assigneeId', 'groupField', 'dateFrom', 'dateTo', 'grouping'], 'query');
    const grouping = query.grouping || 'monthly';
    if (!['daily', 'weekly', 'monthly'].includes(grouping)) {
        throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'grouping is invalid' });
    }
    const parsed = {
        systemId: optionalObjectId(query.systemId, 'systemId'),
        environmentId: optionalObjectId(query.environmentId, 'environmentId'),
        subEnvironmentId: optionalObjectId(query.subEnvironmentId, 'subEnvironmentId'),
        roomId: optionalObjectId(query.roomId, 'roomId'),
        assigneeId: optionalObjectId(query.assigneeId, 'assigneeId'),
        groupField: parseGroupField(query.groupField),
        dateFrom: parseDate(query.dateFrom, 'dateFrom'),
        dateTo: parseDate(query.dateTo, 'dateTo', true),
        grouping
    };
    if (parsed.dateFrom && parsed.dateTo && parsed.dateFrom > parsed.dateTo) {
        throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'dateFrom cannot be later than dateTo' });
    }
    return parsed;
};

function createAnalyticsRoutes({ authenticateAccessToken, requireActiveUser, requireEffectiveMembership, analyticsService }) {
    const router = Router();
    const protectedRoute = [authenticateAccessToken, requireActiveUser, requireEffectiveMembership];
    router.get('/dashboard', ...protectedRoute, asyncHandler(async (request, response) => {
        const data = await analyticsService.aggregate(request.user._id, parseQuery(request.query));
        response.setHeader('Cache-Control', 'no-store');
        response.json({ success: true, data });
    }));
    router.get('/control-center', ...protectedRoute, asyncHandler(async (request, response) => {
        const data = await analyticsService.controlCenter(request.user._id, parseQuery(request.query));
        response.setHeader('Cache-Control', 'no-store');
        response.json({ success: true, data });
    }));
    return router;
}

module.exports = createAnalyticsRoutes;
module.exports.parseQuery = parseQuery;