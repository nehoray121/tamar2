const { createServer } = require('node:http');
const createApp = require('./app.js');
const { connectToDatabase, disconnectFromDatabase } = require('./config/database.js');
const { loadEnvironment } = require('./config/env.js');
const { createLogger } = require('./config/logger.js');
const { closeSocket, initializeSocket } = require('./socket/initializeSocket.js');
const createServiceContainer = require('./services/createServiceContainer.js');

let config;
let logger;
let httpServer;
let io;
let shuttingDown = false;

const listen = (server, port) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
        server.off('error', reject);
        resolve();
    });
});

const stopHttpServer = (server) => new Promise((resolve, reject) => {
    if (!server?.listening) {
        resolve();
        return;
    }

    server.close((error) => {
        if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
        else resolve();
    });
    server.closeIdleConnections?.();
});

const shutdown = async (reason, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;

    const activeLogger = logger || createLogger('info');
    activeLogger.info('shutdown.started', { reason });

    const timeout = setTimeout(() => {
        activeLogger.error('shutdown.timeout', { reason });
        process.exit(1);
    }, config?.shutdownTimeoutMs ?? 10_000);
    timeout.unref();

    try {
        const httpClose = stopHttpServer(httpServer);
        await closeSocket(io);
        await httpClose;
        await disconnectFromDatabase();
        clearTimeout(timeout);
        activeLogger.info('shutdown.completed', { reason });
        process.exit(exitCode);
    } catch (error) {
        clearTimeout(timeout);
        activeLogger.error('shutdown.failed', { reason, error });
        process.exit(1);
    }
};

const start = async () => {
    try {
        config = loadEnvironment();
        logger = createLogger(config.logLevel, { includeStack: config.nodeEnv !== 'production' });

        logger.info('server.starting', {
            environment: config.nodeEnv,
            database: config.mongodbDatabase
        });

        await connectToDatabase(config, logger);

        const services = createServiceContainer({ config, logger });
        const app = createApp({ config, logger, services });
        httpServer = createServer(app);
        io = initializeSocket({ httpServer, config, logger, services });
        services.realtimePublisher?.setIo(io);
services.organizationRealtimePublisher?.setIo(io);
        services.tickets?.realtimePublisher?.setIo(io);
        services.tickets?.assignmentRealtimePublisher?.setIo(io);
        services.tickets?.transferRealtimePublisher?.setIo(io);
        services.tickets?.messageRealtimePublisher?.setIo(io);
        services.tickets?.boardRealtimePublisher?.setIo(io);

        await listen(httpServer, config.port);
        logger.info('server.listening', {
            port: config.port,
            environment: config.nodeEnv
        });
    } catch (error) {
        const activeLogger = logger || createLogger('info');
        activeLogger.error('server.startup_failed', { error });
        await disconnectFromDatabase().catch(() => undefined);
        process.exit(1);
    }
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
if (typeof process.send === 'function') {
    process.once('message', (message) => {
        if (message?.type === 'system:smoke-shutdown') {
            void shutdown('smoke-ipc');
        }
    });
}
process.once('unhandledRejection', (error) => {
    (logger || createLogger('info')).error('process.unhandled_rejection', { error: error instanceof Error ? error : new Error(String(error)) });
    void shutdown('unhandledRejection', 1);
});
process.once('uncaughtException', (error) => {
    (logger || createLogger('info')).error('process.uncaught_exception', { error });
    void shutdown('uncaughtException', 1);
});

void start();
