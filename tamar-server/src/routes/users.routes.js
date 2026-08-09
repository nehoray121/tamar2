const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const AppError = require('../errors/AppError.js');
const { ROLE_VALUES, SCOPE_TYPE_VALUES } = require('../domain/access/constants.js');
const {
    assertExactKeys, optionalObjectId, optionalString, parsePositiveInteger,
    requireEnum, requireObjectId, requireString
} = require('../validation/strictValidation.js');

const parseIfMatch = (request) => {
    const raw = request.headers['if-match'];
    if (!raw) throw new AppError({ statusCode: 428, code: 'PRECONDITION_REQUIRED', message: 'If-Match is required' });
    const normalized = String(raw).replace(/^W\//u, '').replace(/^"|"$/gu, '');
    if (!/^\d+$/u.test(normalized)) throw new AppError({ statusCode: 400, code: 'INVALID_VERSION', message: 'If-Match must contain a user version' });
    return Number(normalized);
};
const parseScope = (scope) => {
    assertExactKeys(scope, ['scopeType', 'scopeId', 'systemId', 'environmentId', 'subEnvironmentId', 'roomId'], 'scope');
    return {
        scopeType: requireEnum(scope.scopeType, 'scope.scopeType', SCOPE_TYPE_VALUES),
        scopeId: requireObjectId(scope.scopeId, 'scope.scopeId'),
        systemId: requireObjectId(scope.systemId, 'scope.systemId'),
        environmentId: optionalObjectId(scope.environmentId, 'scope.environmentId'),
        subEnvironmentId: optionalObjectId(scope.subEnvironmentId, 'scope.subEnvironmentId'),
        roomId: optionalObjectId(scope.roomId, 'scope.roomId')
    };
};
const parseMembership = (body) => {
    assertExactKeys(body, ['role', 'scope']);
    return { role: requireEnum(body.role, 'role', ROLE_VALUES), scope: parseScope(body.scope) };
};

function createUsersRoutes({ authenticateAccessToken, requireActiveUser, requireEffectiveMembership, userManagementService }) {
    const router = Router();
    const protectedRoute = [authenticateAccessToken, requireActiveUser, requireEffectiveMembership];
    router.get('/options', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.query, [], 'query');
        response.json({ success: true, data: await userManagementService.options(request.user._id) });
    }));
    router.get('/', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.query, ['search', 'status', 'role', 'page', 'limit'], 'query');
        const status = request.query.status || 'ALL';
        if (!['ALL', 'ACTIVE', 'INACTIVE'].includes(status)) throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'status is invalid' });
        response.json({ success: true, data: await userManagementService.list(request.user._id, {
            search: optionalString(request.query.search, 'search', { maxLength: 120 }) || '',
            status,
            role: request.query.role ? requireEnum(request.query.role, 'role', ROLE_VALUES) : undefined,
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 25, 100)
        }) });
    }));
    router.post('/', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.body, ['personalNumber', 'displayName', 'email', 'role', 'scope']);
        const input = {
            personalNumber: requireString(request.body.personalNumber, 'personalNumber', { maxLength: 128 }),
            displayName: requireString(request.body.displayName, 'displayName', { maxLength: 200 }),
            email: optionalString(request.body.email, 'email', { maxLength: 320 }),
            role: requireEnum(request.body.role, 'role', ROLE_VALUES),
            scope: parseScope(request.body.scope)
        };
        const result = await userManagementService.create(request.user._id, input);
        response.setHeader('ETag', `"${result.version}"`);
        response.status(201).json({ success: true, data: result });
    }));
    router.get('/:id', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.query, [], 'query');
        const result = await userManagementService.get(request.user._id, requireObjectId(request.params.id, 'id'));
        response.setHeader('ETag', `"${result.version}"`);
        response.json({ success: true, data: result });
    }));
    router.patch('/:id', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.body, ['displayName', 'email', 'isActive']);
        const updates = {};
        if (request.body.displayName !== undefined) updates.displayName = requireString(request.body.displayName, 'displayName', { maxLength: 200 });
        if (request.body.email !== undefined) updates.email = optionalString(request.body.email, 'email', { maxLength: 320 }) || undefined;
        if (request.body.isActive !== undefined) {
            if (typeof request.body.isActive !== 'boolean') throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'isActive must be a boolean' });
            updates.isActive = request.body.isActive;
        }
        if (!Object.keys(updates).length) throw new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'At least one user field is required' });
        const result = await userManagementService.update(
            request.user._id,
            requireObjectId(request.params.id, 'id'),
            parseIfMatch(request),
            updates
        );
        response.setHeader('ETag', `"${result.version}"`);
        response.json({ success: true, data: result });
    }));
    router.post('/:id/memberships', ...protectedRoute, asyncHandler(async (request, response) => {
        const result = await userManagementService.addMembership(
            request.user._id,
            requireObjectId(request.params.id, 'id'),
            parseMembership(request.body)
        );
        response.json({ success: true, data: result });
    }));
    router.delete('/:id/memberships/:membershipId', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.body || {}, ['reason']);
        const result = await userManagementService.removeMembership(
            request.user._id,
            requireObjectId(request.params.id, 'id'),
            requireObjectId(request.params.membershipId, 'membershipId'),
            optionalString(request.body?.reason, 'reason', { maxLength: 500 }) || 'Removed through User Management'
        );
        response.json({ success: true, data: result });
    }));
    return router;
}

module.exports = createUsersRoutes;