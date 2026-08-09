const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const { assertExactKeys, requireObjectId } = require('../validation/strictValidation.js');
const AppError = require('../errors/AppError.js');

const parseVersion = (request) => {
    const raw = request.headers['if-match'];
    if (!raw) throw new AppError({ statusCode: 428, code: 'PRECONDITION_REQUIRED', message: 'If-Match is required' });
    const normalized = String(raw).replace(/^W\//u, '').replace(/^"|"$/gu, '');
    if (!/^\d+$/u.test(normalized)) throw new AppError({ statusCode: 400, code: 'INVALID_VERSION', message: 'If-Match must contain a settings version' });
    return Number(normalized);
};

function createSettingsRoutes({ authenticateAccessToken, requireActiveUser, requireEffectiveMembership, settingsService }) {
    const router = Router();
    const protectedRoute = [authenticateAccessToken, requireActiveUser, requireEffectiveMembership];
    router.get('/rooms/:roomId', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.query, [], 'query');
        const result = await settingsService.get(request.user._id, requireObjectId(request.params.roomId, 'roomId'));
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('ETag', `"${result.version}"`);
        response.json({ success: true, data: result });
    }));
    router.put('/rooms/:roomId', ...protectedRoute, asyncHandler(async (request, response) => {
        assertExactKeys(request.query, [], 'query');
        assertExactKeys(request.body, ['value']);
        const result = await settingsService.save(
            request.user._id,
            requireObjectId(request.params.roomId, 'roomId'),
            parseVersion(request),
            request.body.value
        );
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('ETag', `"${result.version}"`);
        response.json({ success: true, data: result });
    }));
    return router;
}

module.exports = createSettingsRoutes;