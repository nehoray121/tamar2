const AppError = require('../errors/AppError.js');

const isAllowedOrigin = (origin, allowedOrigins) => !origin || allowedOrigins.includes(origin);

const createOriginValidator = (allowedOrigins) => (origin, callback) => {
    if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
    }

    callback(new AppError({
        statusCode: 403,
        code: 'CORS_ORIGIN_DENIED',
        message: 'The request origin is not allowed'
    }));
};

const createHttpCorsOptions = (allowedOrigins) => ({
    origin: createOriginValidator(allowedOrigins),
    credentials: true,
    optionsSuccessStatus: 204
});

const createSocketOptions = (allowedOrigins) => ({
    cors: {
        origin: createOriginValidator(allowedOrigins),
        credentials: true,
        methods: ['GET', 'POST']
    },
    allowRequest: (request, callback) => {
        const origin = request.headers.origin;
        callback(null, isAllowedOrigin(origin, allowedOrigins));
    }
});

module.exports = { createHttpCorsOptions, createSocketOptions, isAllowedOrigin };
