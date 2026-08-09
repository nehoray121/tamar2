const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../src/app.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const config = {
    clientOrigins: ['http://localhost:5173'],
    jsonBodyLimit: '1mb',
    nodeEnv: 'test'
};

test('no public authentication, membership, user-management or Access Request route is mounted', async () => {
    const app = createApp({ config, logger });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;

    try {
        for (const path of ['/api/auth/me', '/api/access-requests', '/api/memberships', '/api/users']) {
            const response = await fetch(`http://127.0.0.1:${port}${path}`);
            const body = await response.json();
            assert.equal(response.status, 404);
            assert.equal(body.error.code, 'NOT_FOUND');
        }
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
