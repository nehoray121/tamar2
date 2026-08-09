const express = require('express');
const healthRoutes = require('./health.routes.js');
const createAuthRoutes = require('./auth.routes.js');
const createAccessRequestOptionsRoutes = require('./accessRequestOptions.routes.js');
const createAccessRequestRoutes = require('./accessRequests.routes.js');
const createOrganizationHierarchyRoutes = require('./organizationHierarchy.routes.js');
const createTicketAssignmentRoutes = require('./ticketAssignments.routes.js');
const createTicketBoardRoutes = require('./ticketBoards.routes.js');
const createTicketMessageRoutes = require('./ticketMessages.routes.js');
const createTicketRoutes = require('./tickets.routes.js');
const createTicketTransferRoutes = require('./ticketTransfers.routes.js');
const createSettingsRoutes = require('./settings.routes.js');
const createUsersRoutes = require('./users.routes.js');
const createAnalyticsRoutes = require('./analytics.routes.js');

/**
 * Central HTTP API route registry.
 *
 * Static assignment routes are mounted before parameterized Ticket routes so
 * /tickets/bulk/assignees can never be interpreted as a Ticket identifier.
 */
function createApiRouter({
    services, authenticateAccessToken, requireProvisionedUser, requireActiveUser, requireEffectiveMembership
}) {
    const router = express.Router();

    router.use('/health', healthRoutes);
    if (!services?.auth) return router;

    router.use('/auth', createAuthRoutes({
        authenticateAccessToken,
        authenticatedIdentityService: services.auth.authenticatedIdentityService
    }));
    router.use('/access-request-options', createAccessRequestOptionsRoutes({
        authenticateAccessToken,
        accessRequestOptionsService: services.auth.accessRequestOptionsService
    }));
    router.use('/access-requests', createAccessRequestRoutes({
        authenticateAccessToken,
        requireActiveUser,
        requireEffectiveMembership,
        accessRequestService: services.accessRequestService,
        requestThrottle: services.auth.requestThrottle
    }));

    router.use('/settings', createSettingsRoutes({
        authenticateAccessToken, requireActiveUser, requireEffectiveMembership,
        settingsService: services.settingsService
    }));
    router.use('/users', createUsersRoutes({
        authenticateAccessToken, requireActiveUser, requireEffectiveMembership,
        userManagementService: services.userManagementService
    }));
    router.use('/', createAnalyticsRoutes({
        authenticateAccessToken, requireActiveUser, requireEffectiveMembership,
        analyticsService: services.analyticsService
    }));

    router.use('/', createOrganizationHierarchyRoutes({
        authenticateAccessToken,
        requireProvisionedUser,
        requireActiveUser,
        requireEffectiveMembership,
        mutationService: services.organization.mutationService
    }));

    if (services.tickets) {
        const ticketRouteDependencies = {
            authenticateAccessToken,
            requireProvisionedUser,
            requireActiveUser,
            requireEffectiveMembership
        };
        router.use('/', createTicketBoardRoutes({
            ...ticketRouteDependencies,
            controller: services.tickets.boardController
        }));
        router.use('/', createTicketMessageRoutes({
            ...ticketRouteDependencies,
            controller: services.tickets.messageController
        }));
        router.use('/', createTicketTransferRoutes({
            ...ticketRouteDependencies,
            controller: services.tickets.transferController
        }));
        router.use('/tickets', createTicketAssignmentRoutes({
            ...ticketRouteDependencies,
            controller: services.tickets.assignmentController
        }));
        router.use('/tickets', createTicketRoutes({
            ...ticketRouteDependencies,
            controller: services.tickets.controller
        }));
    }

    return router;
}

module.exports = createApiRouter;
