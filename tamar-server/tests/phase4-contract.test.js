const assert = require('node:assert/strict');
const test = require('node:test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const read = (file) => readFile(path.join(projectRoot, file), 'utf8');

test('OpenAPI 3.1 contract is valid JSON-compatible YAML and documents only Phase 4 Ticket routes', async () => {
    const document = JSON.parse(await read('docs/openapi/tickets-phase4.yaml'));
    assert.equal(document.openapi, '3.1.0');
    assert.deepEqual(Object.keys(document.paths).sort(), [
        '/tickets', '/tickets/{id}', '/tickets/{id}/close', '/tickets/{id}/history'
    ]);
    assert.ok(document.paths['/tickets'].post.responses['201']);
    assert.ok(document.paths['/tickets/{id}'].patch.responses['428']);
    assert.ok(document.paths['/tickets/{id}'].patch.responses['409']);
    assert.ok(document.paths['/tickets/{id}/close'].post.responses['428']);
});

test('central Ticket and Assignment routers preserve Phase 4 and Phase 5 routes behind auth middleware', async () => {
    const [registry, ticketSource, assignmentSource] = await Promise.all([
        read('src/routes/index.js'),
        read('src/routes/tickets.routes.js'),
        read('src/routes/ticketAssignments.routes.js')
    ]);
    assert.ok(registry.indexOf('createTicketAssignmentRoutes') < registry.lastIndexOf('createTicketRoutes'));
    const calls = (source) => [...source.matchAll(/router\.(get|post|put|patch)\('([^']+)'/g)]
        .map((match) => `${match[1]} ${match[2]}`);
    assert.deepEqual(calls(assignmentSource), [
        'post /bulk/assignees', 'put /:id/assignees',
        'get /:id/assignable-users', 'get /:id/assignments'
    ]);
    assert.deepEqual(calls(ticketSource), [
        'get /', 'post /', 'get /:id', 'patch /:id',
        'post /:id/close', 'get /:id/history'
    ]);
    assert.match(ticketSource, /authenticateAccessToken/);
    assert.match(assignmentSource, /authenticateAccessToken/);
    assert.doesNotMatch(ticketSource + assignmentSource, /assign-me|transfer|message|attachment|category|reopen|delete/i);
});

test('Socket organization rooms are server-derived and there is no client-controlled join listener', async () => {
    const source = await read('src/socket/initializeSocket.js');
    assert.match(source, /system:\$\{membership\.systemId\}/);
    assert.match(source, /subEnvironment:\$\{membership\.subEnvironmentId\}/);
    assert.match(source, /room:\$\{membership\.roomId\}/);
    assert.doesNotMatch(source, /socket\.on\(['"](?:join|subscribe|join-room)/i);
});

test('Ticket realtime payload excludes business body and identity data', async () => {
    const source = await read('src/modules/tickets/services/TicketRealtimePublisher.js');
    assert.doesNotMatch(source, /description|fieldValues|closureSummary|personalNumber|accessToken|claims/);
    for (const event of ['ticket:created', 'ticket:updated', 'ticket:closed', 'ticket:history:created']) {
        assert.match(await read('src/modules/tickets/services/TicketService.js'), new RegExp(event.replace(':', '\\:')));
    }
});

test('Phase 4 documentation records reconnect and deferred outbox decisions', async () => {
    const source = await read('docs/phase4-ticket-core.md');
    assert.match(source, /require reconnect/i);
    assert.match(source, /no outbox/i);
    assert.match(source, /bounded escaped/i);
});
