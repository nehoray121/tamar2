const createRequestLogger = (logger) => (request, response, next) => {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        logger.info('http.request', {
            requestId: request.id,
            method: request.method,
            path: request.path,
            statusCode: response.statusCode,
            durationMs: Number(durationMs.toFixed(2))
        });
    });

    next();
};

module.exports = createRequestLogger;
