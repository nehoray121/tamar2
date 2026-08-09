/**
 * Access Request option HTTP entry points
 *
 * GET /api/access-request-options
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const { assertExactKeys, optionalObjectId } = require('../validation/strictValidation.js');
const createAccessRequestOptionsRoutes = ({ authenticateAccessToken, accessRequestOptionsService }) => {
    const router = Router();
    router.get('/', authenticateAccessToken, asyncHandler(async (request, response) => {
        assertExactKeys(request.query, ['systemId', 'environmentId', 'subEnvironmentId'], 'query');
        const options = await accessRequestOptionsService.getOptions({
            systemId: optionalObjectId(request.query.systemId, 'systemId'),
            environmentId: optionalObjectId(request.query.environmentId, 'environmentId'),
            subEnvironmentId: optionalObjectId(request.query.subEnvironmentId, 'subEnvironmentId')
        });
        response.json({ success: true, data: options });
    }));
    return router;
};

module.exports = createAccessRequestOptionsRoutes;
