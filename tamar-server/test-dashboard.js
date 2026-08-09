const createApp = require('./src/app.js');
const { loadEnvironment } = require('./src/config/env.js');
const { createLogger } = require('./src/config/logger.js');
const createServiceContainer = require('./src/services/createServiceContainer.js');
const { connectToDatabase, disconnectFromDatabase } = require('./src/config/database.js');
const request = require('supertest');

async function run() {
    const config = loadEnvironment();
    const logger = createLogger('error', { includeStack: true });
    await connectToDatabase(config, logger);
    const services = createServiceContainer({ config, logger });
    const app = createApp({ config, logger, services });

    // Try to call the dashboard without auth to see what happens, wait we need auth
    // Let's mock the authenticateAccessToken middleware to always set req.user to a super admin
    app.use((req, res, next) => {
        if (req.path === '/api/dashboard') {
            req.user = { _id: '64b0f0a5f0b5d3c900d8b4e2' }; // mock admin
            req.auth = { personalNumber: '1234567' };
            next();
        } else {
            next();
        }
    });

    const res = await request(app).get('/api/dashboard?grouping=monthly');
    console.log('STATUS:', res.status);
    console.log('BODY:', res.body);

    await disconnectFromDatabase();
}

run().catch(console.error);
