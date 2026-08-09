const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const {
    parseBoardListQuery, parseBoardParams, parseCategoryBody, parseCategoryId,
    parseCategoryIfMatch, parseCategoryListQuery, parseEmptyBody, parseItemId,
    parseStateBody, parseStateIfMatch, rejectEmptyCategoryUpdate, requireCategoryCreateFields
} = require('../modules/tickets/boards/domain/board.validators.js');

/** All seven Phase 8 Room Board HTTP entry points. */
function createTicketBoardRoutes({
    authenticateAccessToken, requireProvisionedUser, requireActiveUser,
    requireEffectiveMembership, controller
}) {
    const router = Router();
    const protectedRoute = [authenticateAccessToken, requireProvisionedUser, requireActiveUser, requireEffectiveMembership];
    const board = '/rooms/:roomId/boards/:boardType';

    router.get(`${board}/items`, ...protectedRoute, parseBoardParams, parseBoardListQuery, asyncHandler(controller.listItems));
    router.get(`${board}/categories`, ...protectedRoute, parseBoardParams, parseCategoryListQuery, asyncHandler(controller.listCategories));
    router.post(`${board}/categories`, ...protectedRoute, parseBoardParams, parseCategoryBody, requireCategoryCreateFields, asyncHandler(controller.createCategory));
    router.patch(`${board}/categories/:categoryId`, ...protectedRoute, parseBoardParams, parseCategoryId, parseCategoryIfMatch, parseCategoryBody, rejectEmptyCategoryUpdate, asyncHandler(controller.updateCategory));
    router.post(`${board}/categories/:categoryId/archive`, ...protectedRoute, parseBoardParams, parseCategoryId, parseCategoryIfMatch, parseEmptyBody, asyncHandler(controller.archiveCategory));
    router.get(`${board}/items/:itemId/state`, ...protectedRoute, parseBoardParams, parseItemId, asyncHandler(controller.getState));
    router.patch(`${board}/items/:itemId/state`, ...protectedRoute, parseBoardParams, parseItemId, parseStateIfMatch, parseStateBody, asyncHandler(controller.updateState));

    return router;
}

module.exports = createTicketBoardRoutes;
