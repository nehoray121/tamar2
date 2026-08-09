const createAuthenticateAccessToken = ({ accessTokenVerifier, claimsMapper, authenticatedIdentityService, logger }) => async (request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
        const token = accessTokenVerifier.extractFromHttpRequest(request);
        const { claims } = await accessTokenVerifier.verify(token);
        request.auth = claimsMapper.mapVerifiedClaims(claims);
        request.user = await authenticatedIdentityService.resolveUser(request.auth);
        logger.info('authentication.succeeded', { requestId: request.id, provider: request.auth.provider, provisioned: Boolean(request.user) });
        next();
    } catch (error) {
        logger.warn('authentication.failed', { requestId: request.id, reason: error.safeReason || error.code || 'unknown' });
        next(error);
    }
};

module.exports = createAuthenticateAccessToken;
