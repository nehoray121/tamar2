const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler.js');
const {
    parseAssignableUsersQuery,
    parseAssignmentsQuery,
    parseBulkAssignees,
    parseReplaceAssignees
} = require('../modules/tickets/validation/assignmentValidation.js');
const { parseIfMatch, parseTicketId } = require('../modules/tickets/validation/ticketValidation.js');

/**
 * Ticket Assignment HTTP entry points
 *
 * POST /api/tickets/bulk/assignees
 * PUT  /api/tickets/:id/assignees
 * GET  /api/tickets/:id/assignable-users
 * GET  /api/tickets/:id/assignments
 */
function createTicketAssignmentRoutes({
    authenticateAccessToken, requireActiveUser, requireEffectiveMembership, controller
}) {
    const router = Router();
    const protectedRoute = [authenticateAccessToken, requireActiveUser, requireEffectiveMembership];

    router.post('/bulk/assignees', ...protectedRoute, parseBulkAssignees, asyncHandler(controller.bulk));
    router.put('/:id/assignees', ...protectedRoute, parseTicketId, parseIfMatch, parseReplaceAssignees, asyncHandler(controller.replace));
    router.get('/:id/assignable-users', ...protectedRoute, parseTicketId, parseAssignableUsersQuery, asyncHandler(controller.assignableUsers));
    router.get('/:id/assignments', ...protectedRoute, parseTicketId, parseAssignmentsQuery, asyncHandler(controller.assignments));

    return router;
}

module.exports = createTicketAssignmentRoutes;
