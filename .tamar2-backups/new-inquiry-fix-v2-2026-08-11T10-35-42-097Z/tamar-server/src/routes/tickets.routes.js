const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const {
    parseCloseTicket,
    parseCreateTicket,
    parseIfMatch,
    parseTicketHistoryQuery,
    parseTicketId,
    parseTicketListQuery,
    parseUpdateTicket
} = require('../modules/tickets/validation/ticketValidation.js');

/**
 * Ticket HTTP entry points
 *
 * GET   /api/tickets
 * POST  /api/tickets
 * GET   /api/tickets/:id
 * PATCH /api/tickets/:id
 * POST  /api/tickets/:id/close
 * GET   /api/tickets/:id/history
 */
function createTicketRoutes({
    authenticateAccessToken, requireActiveUser, requireEffectiveMembership, controller
}) {
    const router = Router();
    const protectedRoute = [authenticateAccessToken, requireActiveUser, requireEffectiveMembership];

    router.get('/', ...protectedRoute, parseTicketListQuery, asyncHandler(controller.list));
    router.post('/', ...protectedRoute, parseCreateTicket, asyncHandler(controller.create));
    router.get('/:id', ...protectedRoute, parseTicketId, asyncHandler(controller.get));
    router.patch('/:id', ...protectedRoute, parseTicketId, parseIfMatch, parseUpdateTicket, asyncHandler(controller.update));
    router.post('/:id/close', ...protectedRoute, parseTicketId, parseIfMatch, parseCloseTicket, asyncHandler(controller.close));
    router.get('/:id/history', ...protectedRoute, parseTicketId, parseTicketHistoryQuery, asyncHandler(controller.history));

    return router;
}

module.exports = createTicketRoutes;
