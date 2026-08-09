const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('Phase 5R architecture verifier enforces CommonJS and centralized HTTP routes', () => {
    const verifyArchitecture = require('../scripts/verify-architecture.js');
    const result = verifyArchitecture();
    assert.equal(result.result, 'PASS');
    assert.equal(result.centralRegistry, 'src/routes/index.js');
    assert.equal(result.canonicalBulkRoute, '/api/tickets/bulk/assignees');
});

test('critical backend modules and JOSE load directly through CommonJS require', () => {
    const jose = require('jose');
    assert.equal(typeof jose.createRemoteJWKSet, 'function');
    assert.equal(typeof jose.jwtVerify, 'function');
    assert.equal(typeof require('../src/app.js'), 'function');
    assert.equal(typeof require('../src/routes/index.js'), 'function');
    assert.equal(typeof require('../src/services/createServiceContainer.js'), 'function');
    assert.equal(typeof require('../src/auth/AccessTokenVerifier.js'), 'function');
    assert.ok(require('../src/modules/tickets/models/TicketAssignment.js').modelName);
});

test('route registry and OpenAPI agree on the canonical bulk assignment endpoint', () => {
    const routeSource = fs.readFileSync(path.join(projectRoot, 'src/routes/ticketAssignments.routes.js'), 'utf8');
    const openApi = JSON.parse(fs.readFileSync(path.join(projectRoot, 'docs/openapi/tickets-phase5-assignments.yaml'), 'utf8'));
    const routeMap = fs.readFileSync(path.join(projectRoot, 'docs/api-route-map.md'), 'utf8');
    assert.match(routeSource, /router\.post\('\/bulk\/assignees'/);
    assert.ok(openApi.paths['/tickets/bulk/assignees']?.post);
    assert.equal(openApi.paths['/tickets/assignees/bulk'], undefined);
    assert.equal(routeMap.split('\n').filter((line) => /^\| (?:GET|POST|PUT|PATCH|DELETE) \|/.test(line)).length, 40);
    assert.ok(routeMap.includes('| POST | `/api/tickets/bulk/assignees` |'));
    assert.ok(routeMap.includes('| POST | `/api/environments/:environmentId/sub-environments` |'));
    assert.ok(routeMap.includes('| POST | `/api/sub-environments/:subEnvironmentId/rooms` |'));    assert.doesNotMatch(routeSource, /assignees\/bulk|assign-me|transfer/i);
});

test('canonical bulk route is mounted while the obsolete route remains absent', async () => {
    const createApp = require('../src/app.js');
    const createServiceContainer = require('../src/services/createServiceContainer.js');
    const { createTestConfig, initializeAuthKeys } = require('./helpers/authFixture.js');
    await initializeAuthKeys();
    const config = createTestConfig();
    const logger = { debug() {}, info() {}, warn() {}, error() {} };
    const services = createServiceContainer({ config, logger });
    const server = createApp({ config, logger, services }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    try {
        const canonical = await fetch(`${baseUrl}/api/tickets/bulk/assignees`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
        });
        const obsolete = await fetch(`${baseUrl}/api/tickets/assignees/bulk`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
        });
        assert.equal(canonical.status, 401);
        assert.equal(obsolete.status, 404);
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
