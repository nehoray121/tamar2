const AppError = require('../errors/AppError.js');

const normalizeError = (error) => {
    if (error instanceof AppError) return error;

    if (error?.type === 'entity.too.large') {
        return new AppError({ statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large' });
    }

    if (error?.type === 'entity.parse.failed') {
        return new AppError({
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'The request body contains invalid JSON'
        });
    }

    return new AppError({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        cause: error
    });
};

const createErrorHandler = ({ logger, nodeEnv }) => (error, request, response, next) => {
    const safeError = normalizeError(error);

    logger.error('http.request_failed', {
        requestId: request.id,
        method: request.method,
        path: request.path,
        statusCode: safeError.statusCode,
        code: safeError.code,
        error: nodeEnv === 'production' ? new Error(safeError.message) : error
    });

    if (response.headersSent) {
        next(error);
        return;
    }

    if (safeError.statusCode === 401) response.setHeader('WWW-Authenticate', 'Bearer');
    const requestPath = request.originalUrl || request.path;
    if (requestPath.startsWith('/api/auth') || requestPath.startsWith('/api/access-request') || requestPath.startsWith('/api/tickets') || requestPath.startsWith('/api/rooms/')) response.setHeader('Cache-Control', 'no-store');

    response.status(safeError.statusCode).json({
        success: false,
        error: {
            code: safeError.code,
            message: safeError.message,
            fieldErrors: safeError.fieldErrors ?? null,
            requestId: request.id
        }
    });
};

module.exports = createErrorHandler;
