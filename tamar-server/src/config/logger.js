const LEVEL_PRIORITY = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const serializeError = (error, includeStack = false) => {
    if (!error) return undefined;
    return {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        ...(includeStack && error.stack ? { stack: error.stack } : {})
    };
};

const createLogger = (configuredLevel = 'info', { includeStack = false } = {}) => {
    const threshold = LEVEL_PRIORITY[configuredLevel] ?? LEVEL_PRIORITY.info;

    const write = (level, message, context = {}) => {
        if (LEVEL_PRIORITY[level] > threshold) return;

        const payload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...context
        };

        if (context.error instanceof Error) {
            payload.error = serializeError(context.error, includeStack);
        }

        const line = JSON.stringify(payload);
        if (level === 'error') {
            console.error(line);
        } else if (level === 'warn') {
            console.warn(line);
        } else {
            console.log(line);
        }
    };

    return {
        error: (message, context) => write('error', message, context),
        warn: (message, context) => write('warn', message, context),
        info: (message, context) => write('info', message, context),
        debug: (message, context) => write('debug', message, context)
    };
};

module.exports = { createLogger, serializeError };
