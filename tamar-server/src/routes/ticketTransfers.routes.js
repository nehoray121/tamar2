const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const { parseIfMatch, parseTicketId } = require('../modules/tickets/validation/ticketValidation.js');
const {
    parseAcceptTransfer,
    parseCancelTransfer,
    parseInitiateTransfer,
    parseTransferHistoryQuery,
    parseTransferId,
    parseTransferListQuery,
    parseTransferTargetsQuery
} = require('../modules/tickets/transfers/domain/transfer.validators.js');

/**
 * Ticket Transfer HTTP entry points
 *
 * GET  /api/tickets/:id/transfer-targets
 * POST /api/tickets/:id/transfers
 * GET  /api/tickets/:id/transfers
 * GET  /api/ticket-transfers
 * GET  /api/ticket-transfers/:id
 * POST /api/ticket-transfers/:id/accept
 * POST /api/ticket-transfers/:id/cancel
 */
function createTicketTransferRoutes({
    authenticateAccessToken, requireActiveUser, requireEffectiveMembership, controller
}) {
    const router = Router();
    const protectedRoute = [authenticateAccessToken, requireActiveUser, requireEffectiveMembership];

    router.get('/tickets/:id/transfer-targets', ...protectedRoute, parseTicketId, parseTransferTargetsQuery, asyncHandler(controller.targets));
    router.post('/tickets/:id/transfers', ...protectedRoute, parseTicketId, parseIfMatch, parseInitiateTransfer, asyncHandler(controller.initiate));
    router.get('/tickets/:id/transfers', ...protectedRoute, parseTicketId, parseTransferHistoryQuery, asyncHandler(controller.history));
    router.get('/ticket-transfers', ...protectedRoute, parseTransferListQuery, asyncHandler(controller.list));
    router.post('/ticket-transfers/:id/accept', ...protectedRoute, parseTransferId, parseIfMatch, parseAcceptTransfer, asyncHandler(controller.accept));
    router.post('/ticket-transfers/:id/cancel', ...protectedRoute, parseTransferId, parseIfMatch, parseCancelTransfer, asyncHandler(controller.cancel));
    router.get('/ticket-transfers/:id', ...protectedRoute, parseTransferId, asyncHandler(controller.detail));

    return router;
}

module.exports = createTicketTransferRoutes;
