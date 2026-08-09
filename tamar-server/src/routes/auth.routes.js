/**
 * Authentication HTTP entry points
 *
 * GET /api/auth/me
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const createAuthRoutes = ({ authenticateAccessToken, authenticatedIdentityService }) => {
    const router = Router();
    router.get('/me', authenticateAccessToken, asyncHandler(async (request, response) => {
        const state = await authenticatedIdentityService.getAuthenticationState(request.auth);
        response.status(200).json({ success: true, data: state });
    }));
    return router;
};

module.exports = createAuthRoutes;
