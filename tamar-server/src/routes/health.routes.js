/**
 * Health HTTP entry points
 *
 * GET /api/health
 * GET /api/health/ready
 */
const { Router } = require('express');
const { isDatabaseReady, pingDatabase } = require('../config/database.js');
const AppError = require('../errors/AppError.js');
const asyncHandler = require('../utils/asyncHandler.js');

const router = Router();

router.get('/', (request, response) => {
    response.status(200).json({
        success: true,
        data: {
            status: 'alive',
            service: 'tamar-server',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Number(process.uptime().toFixed(3))
        }
    });
});

router.get('/ready', asyncHandler(async (request, response) => {
    const ready = isDatabaseReady() && await pingDatabase();
    if (!ready) {
        throw new AppError({
            statusCode: 503,
            code: 'DATABASE_UNAVAILABLE',
            message: 'The service is not ready'
        });
    }

    response.status(200).json({
        success: true,
        data: {
            status: 'ready',
            database: 'connected',
            timestamp: new Date().toISOString()
        }
    });
}));

module.exports = router;
