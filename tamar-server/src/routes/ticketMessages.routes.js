const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const { parseTicketId } = require('../modules/tickets/validation/ticketValidation.js');
const {
    parseCreateMessage,
    parseDeleteMessage,
    parseEditMessage,
    parseMessageId,
    parseMessageIfMatch,
    parseMessageListQuery
} = require('../modules/tickets/messages/domain/message.validators.js');

/**
 * Ticket Message HTTP entry points
 *
 * GET    /api/tickets/:id/messages
 * POST   /api/tickets/:id/messages
 * PATCH  /api/tickets/:id/messages/:messageId
 * DELETE /api/tickets/:id/messages/:messageId
 */
function createTicketMessageRoutes({
    authenticateAccessToken,
    requireProvisionedUser,
    requireActiveUser,
    requireEffectiveMembership,
    controller
}) {
    const router = Router();
    const protectedRoute = [
        authenticateAccessToken,
        requireProvisionedUser,
        requireActiveUser,
        requireEffectiveMembership
    ];

    router.get('/tickets/:id/messages', ...protectedRoute, parseTicketId, parseMessageListQuery, asyncHandler(controller.list));
    router.post('/tickets/:id/messages', ...protectedRoute, parseTicketId, parseCreateMessage, asyncHandler(controller.create));
    router.patch('/tickets/:id/messages/:messageId', ...protectedRoute, parseTicketId, parseMessageId, parseMessageIfMatch, parseEditMessage, asyncHandler(controller.edit));
    router.delete('/tickets/:id/messages/:messageId', ...protectedRoute, parseTicketId, parseMessageId, parseMessageIfMatch, parseDeleteMessage, asyncHandler(controller.delete));

    return router;
}

module.exports = createTicketMessageRoutes;
