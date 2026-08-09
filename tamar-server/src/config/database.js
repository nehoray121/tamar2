const mongoose = require('mongoose');

let listenersRegistered = false;

const registerConnectionLogging = (logger) => {
    if (listenersRegistered) return;
    listenersRegistered = true;

    mongoose.connection.on('connected', () => logger.info('mongodb.connected'));
    mongoose.connection.on('disconnected', () => logger.warn('mongodb.disconnected'));
    mongoose.connection.on('reconnected', () => logger.info('mongodb.reconnected'));
    mongoose.connection.on('error', (error) => logger.error('mongodb.connection_error', { error }));
};

const connectToDatabase = async (config, logger) => {
    registerConnectionLogging(logger);
    mongoose.set('autoIndex', false);
    mongoose.set('strictQuery', true);

    await mongoose.connect(config.mongodbUri, {
        dbName: config.mongodbDatabase,
        autoIndex: false,
        serverSelectionTimeoutMS: 8_000,
        maxPoolSize: 10
    });

    logger.info('mongodb.ready', { database: config.mongodbDatabase });
};

const disconnectFromDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
};

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const pingDatabase = async () => {
    if (!isDatabaseReady() || !mongoose.connection.db) return false;
    try {
        const result = await mongoose.connection.db.admin().command({ ping: 1 });
        return result?.ok === 1;
    } catch {
        return false;
    }
};

module.exports = { connectToDatabase, disconnectFromDatabase, isDatabaseReady, pingDatabase };
