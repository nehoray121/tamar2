/**
 * Access Request HTTP entry points
 *
 * GET  /api/access-requests/me
 * POST /api/access-requests
 * GET  /api/access-requests
 * POST /api/access-requests/:id/approve
 * POST /api/access-requests/:id/reject
 * POST /api/access-requests/:id/cancel
 */
const { Router } = require('express');
const { ACCESS_REQUEST_STATUSES, ACCESS_REQUEST_STATUS_VALUES, ACCESS_REQUEST_TYPE_VALUES, REQUESTABLE_ROLES, SCOPE_TYPE_VALUES } = require('../domain/access/constants.js');
const AppError = require('../errors/AppError.js');
const asyncHandler = require('../utils/asyncHandler.js');
const { assertExactKeys, optionalObjectId, optionalString, parsePositiveInteger, requireEnum, requireObjectId } = require('../validation/strictValidation.js');

const safeRequest = (request) => ({
    id: String(request._id),
    requesterUserId: request.requesterUserId ? String(request.requesterUserId) : null,
    requester: request.requesterIdentitySnapshot ? {
        displayName: request.requesterIdentitySnapshot.displayName,
        email: request.requesterIdentitySnapshot.email
    } : undefined,
    requestType: request.requestType,
    requestedRole: request.requestedRole,
    requestedScopeType: request.requestedScopeType,
    requestedScopeId: String(request.requestedScopeId),
    systemId: String(request.systemId),
    environmentId: String(request.environmentId),
    subEnvironmentId: String(request.subEnvironmentId),
    roomId: request.roomId ? String(request.roomId) : null,
    reason: request.reason,
    status: request.status,
    approvedRole: request.approvedRole,
    approvedScopeType: request.approvedScopeType,
    approvedScopeId: request.approvedScopeId ? String(request.approvedScopeId) : undefined,
    createdAt: request.createdAt,
    reviewedAt: request.reviewedAt
});
const requireEligibleRequester = (request, _response, next) => {
    if (request.user && !request.user.isActive) return next(new AppError({ statusCode: 403, code: 'USER_DISABLED', message: 'The authenticated user is disabled in Tamar' }));
    next();
};

const parseCreateBody = (body) => {
    assertExactKeys(body, ['requestType', 'requestedRole', 'requestedScopeType', 'requestedScopeId', 'systemId', 'environmentId', 'subEnvironmentId', 'roomId', 'reason']);
    return {
        requestType: requireEnum(body.requestType, 'requestType', ACCESS_REQUEST_TYPE_VALUES),
        requestedRole: requireEnum(body.requestedRole, 'requestedRole', REQUESTABLE_ROLES),
        requestedScopeType: requireEnum(body.requestedScopeType, 'requestedScopeType', SCOPE_TYPE_VALUES),
        requestedScopeId: requireObjectId(body.requestedScopeId, 'requestedScopeId'),
        systemId: requireObjectId(body.systemId, 'systemId'),
        environmentId: requireObjectId(body.environmentId, 'environmentId'),
        subEnvironmentId: requireObjectId(body.subEnvironmentId, 'subEnvironmentId'),
        roomId: optionalObjectId(body.roomId, 'roomId'),
        reason: optionalString(body.reason, 'reason', { maxLength: 1000 })
    };
};
const parseDecisionBody = (body) => {
    assertExactKeys(body, ['approvedRole', 'approvedScopeType', 'approvedScopeId', 'systemId', 'environmentId', 'subEnvironmentId', 'roomId', 'reviewComment']);
    return {
        approvedRole: requireEnum(body.approvedRole, 'approvedRole', REQUESTABLE_ROLES),
        approvedScope: {
            scopeType: requireEnum(body.approvedScopeType, 'approvedScopeType', SCOPE_TYPE_VALUES),
            scopeId: requireObjectId(body.approvedScopeId, 'approvedScopeId'),
            systemId: requireObjectId(body.systemId, 'systemId'),
            environmentId: requireObjectId(body.environmentId, 'environmentId'),
            subEnvironmentId: requireObjectId(body.subEnvironmentId, 'subEnvironmentId'),
            roomId: optionalObjectId(body.roomId, 'roomId')
        },
        reviewComment: optionalString(body.reviewComment, 'reviewComment', { maxLength: 1000 })
    };
};

const createAccessRequestRoutes = ({ authenticateAccessToken, requireActiveUser, requireEffectiveMembership, accessRequestService, requestThrottle }) => {
    const router = Router();
    router.use(authenticateAccessToken);
    router.get('/me', requireEligibleRequester, asyncHandler(async (request, response) => {
        const requests = await accessRequestService.listMyRequests(request.auth, request.user?._id);
        response.json({ success: true, data: requests.map(safeRequest) });
    }));
    router.post('/', requireEligibleRequester, asyncHandler(async (request, response) => {
        requestThrottle.assertAllowed(request.auth.personalNumberLookupHash);
        const payload = parseCreateBody(request.body);
        const created = await accessRequestService.createAccessRequest({
            ...payload,
            requesterUserId: request.user?._id,
            requesterIdentitySnapshot: {
                provider: request.auth.provider,
                subject: request.auth.subject,
                personalNumberLookupHash: request.auth.personalNumberLookupHash,
                personalNumberLast4: request.auth.personalNumberLast4,
                displayName: request.auth.displayName,
                email: request.auth.email
            }
        });
        response.status(201).json({ success: true, data: safeRequest(created) });
    }));
    router.get('/', requireActiveUser, requireEffectiveMembership, asyncHandler(async (request, response) => {
        assertExactKeys(request.query, ['status', 'page', 'limit'], 'query');
        const filters = {
            status: request.query.status ? requireEnum(request.query.status, 'status', ACCESS_REQUEST_STATUS_VALUES) : ACCESS_REQUEST_STATUSES.PENDING,
            page: parsePositiveInteger(request.query.page, 'page', 1, 100000),
            limit: parsePositiveInteger(request.query.limit, 'limit', 25, 100)
        };
        const result = await accessRequestService.listReviewableRequests(request.user._id, filters);
        response.json({ success: true, data: { ...result, items: result.items.map(safeRequest) } });
    }));
    router.post('/:id/approve', requireActiveUser, requireEffectiveMembership, asyncHandler(async (request, response) => {
        const requestId = requireObjectId(request.params.id, 'id');
        const decision = parseDecisionBody(request.body);
        const approved = await accessRequestService.approveAccessRequest({ requestId, reviewerUserId: request.user._id, ...decision });
        response.json({ success: true, data: safeRequest(approved) });
    }));
    router.post('/:id/reject', requireActiveUser, requireEffectiveMembership, asyncHandler(async (request, response) => {
        const requestId = requireObjectId(request.params.id, 'id');
        assertExactKeys(request.body, ['reviewComment']);
        const rejected = await accessRequestService.rejectAccessRequest({ requestId, reviewerUserId: request.user._id, reviewComment: optionalString(request.body.reviewComment, 'reviewComment', { maxLength: 1000 }) });
        response.json({ success: true, data: safeRequest(rejected) });
    }));
    router.post('/:id/cancel', requireEligibleRequester, asyncHandler(async (request, response) => {
        const requestId = requireObjectId(request.params.id, 'id');
        assertExactKeys(request.body, []);
        const cancelled = await accessRequestService.cancelOwnAccessRequest({ requestId, auth: request.auth, requesterUserId: request.user?._id });
        response.json({ success: true, data: safeRequest(cancelled) });
    }));
    return router;
};

module.exports = createAccessRequestRoutes;
module.exports.safeRequest = safeRequest;
