const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const {
    ORGANIZATION_LIMITS
} = require('../domain/organization/constants.js');
const {
    assertExactKeys,
    optionalString,
    requireObjectId,
    requireString
} = require('../validation/strictValidation.js');

const parseCreateInput = (body) => {
    assertExactKeys(body, ['name', 'description']);
    return {
        name: requireString(body.name, 'name', {
            maxLength: ORGANIZATION_LIMITS.NAME_MAX
        }),
        description: optionalString(body.description, 'description', {
            maxLength: ORGANIZATION_LIMITS.DESCRIPTION_MAX
        })
    };
};

function createOrganizationHierarchyRoutes({
    authenticateAccessToken,
    requireProvisionedUser,
    requireActiveUser,
    requireEffectiveMembership,
    mutationService
}) {
    const router = Router();
    const protectedRoute = [
        authenticateAccessToken,
        requireProvisionedUser,
        requireActiveUser,
        requireEffectiveMembership
    ];

    router.post(
        '/systems/:systemId/environments',
        ...protectedRoute,
        asyncHandler(async (request, response) => {
            const systemId = requireObjectId(
                request.params.systemId,
                'systemId'
            );
            const input = parseCreateInput(request.body);
            const data = await mutationService.createEnvironment(
                request.user._id,
                systemId,
                input
            );
            response.status(201).json({ success: true, data });
        })
    );

    router.post(
        '/environments/:environmentId/sub-environments',
        ...protectedRoute,
        asyncHandler(async (request, response) => {
            const environmentId = requireObjectId(
                request.params.environmentId,
                'environmentId'
            );
            const input = parseCreateInput(request.body);
            const data = await mutationService.createSubEnvironment(
                request.user._id,
                environmentId,
                input
            );
            response.status(201).json({ success: true, data });
        })
    );

    router.post(
        '/sub-environments/:subEnvironmentId/rooms',
        ...protectedRoute,
        asyncHandler(async (request, response) => {
            const subEnvironmentId = requireObjectId(
                request.params.subEnvironmentId,
                'subEnvironmentId'
            );
            const input = parseCreateInput(request.body);
            const data = await mutationService.createRoom(
                request.user._id,
                subEnvironmentId,
                input
            );
            response.status(201).json({ success: true, data });
        })
    );

    return router;
}

module.exports = createOrganizationHierarchyRoutes;
module.exports.parseCreateInput = parseCreateInput;
