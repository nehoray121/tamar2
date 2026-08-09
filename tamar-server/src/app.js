const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { createHttpCorsOptions } = require('./config/socket.js');
const createErrorHandler = require('./middleware/errorHandler.js');
const createAuthenticateAccessToken = require('./middleware/authenticateAccessToken.js');
const createRequireEffectiveMembership = require('./middleware/requireEffectiveMembership.js');
const requireActiveUser = require('./middleware/requireActiveUser.js');
const requireProvisionedUser = require('./middleware/requireProvisionedUser.js');
const notFound = require('./middleware/notFound.js');
const requestId = require('./middleware/requestId.js');
const createRequestLogger = require('./middleware/requestLogger.js');
const createApiRouter = require('./routes/index.js');

const createApp = ({ config, logger, services }) => {
    const app = express();
    app.disable('x-powered-by');
    app.use(requestId);
    app.use(createRequestLogger(logger));
    app.use(helmet());
    app.use(cors(createHttpCorsOptions(config.clientOrigins)));
    app.use(express.json({ limit: config.jsonBodyLimit }));

    const authenticateAccessToken = services?.auth ? createAuthenticateAccessToken({
        accessTokenVerifier: services.auth.accessTokenVerifier,
        claimsMapper: services.auth.claimsMapper,
        authenticatedIdentityService: services.auth.authenticatedIdentityService,
        logger
    }) : undefined;
    const requireEffectiveMembership = services?.auth
        ? createRequireEffectiveMembership({ scopeResolver: services.scopeResolver })
        : undefined;

    app.use('/api', createApiRouter({
        services,
        authenticateAccessToken,
        requireProvisionedUser,
        requireActiveUser,
        requireEffectiveMembership
    }));
    app.use(notFound);
    app.use(createErrorHandler({ logger, nodeEnv: config.nodeEnv }));
    return app;
};

module.exports = createApp;