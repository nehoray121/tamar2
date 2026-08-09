const assert = require('node:assert/strict');
const test = require('node:test');
const createApp = require('../src/app.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const config = {
    clientOrigins: ['http://localhost:5173'],
    jsonBodyLimit: '1mb',
    nodeEnv: 'test'
};

test('no public organization or Phase 2A business route is mounted', async () => {
    const app = createApp({ config, logger });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;

    try {
        const paths = [
            '/api/systems',
            '/api/environments',
            '/api/sub-environments',
            '/api/rooms',
            '/api/users',
            '/api/memberships',
            '/api/access-requests',
            '/api/auth/me'
        ];
        for (const path of paths) {
            const response = await fetch(`http://127.0.0.1:${port}${path}`);
            const body = await response.json();
            assert.equal(response.status, 404, path);
            assert.equal(body.error.code, 'NOT_FOUND', path);
        }
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
