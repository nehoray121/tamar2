const assert = require('node:assert/strict');
const test = require('node:test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const read = (file) => readFile(path.join(projectRoot, file), 'utf8');

test('Phase 6 OpenAPI is JSON-compatible OpenAPI 3.1 and documents exactly seven Transfer operations', async () => {
    const document = JSON.parse(await read('docs/openapi/tickets-phase6-transfers.yaml'));
    assert.equal(document.openapi, '3.1.0');
    assert.deepEqual(Object.keys(document.paths).sort(), [
        '/ticket-transfers', '/ticket-transfers/{id}', '/ticket-transfers/{id}/accept',
        '/ticket-transfers/{id}/cancel', '/tickets/{id}/transfer-targets', '/tickets/{id}/transfers'
    ]);
    const operations = Object.values(document.paths).flatMap((entry) =>
        Object.entries(entry).filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
    );
    assert.equal(operations.length, 7);
    assert.ok(document.paths['/tickets/{id}/transfers'].post.responses['201']);
    assert.ok(document.paths['/tickets/{id}/transfers'].post.responses['428']);
    assert.ok(document.paths['/ticket-transfers/{id}/accept'].post.responses['409']);
    assert.ok(document.paths['/ticket-transfers/{id}/cancel'].post.responses['428']);
    assert.deepEqual(document.components.schemas.TransferStatus.enum, [
        'PENDING_ACCEPTANCE', 'ACCEPTED', 'CANCELLED'
    ]);
});

test('central Transfer router exposes exactly the approved Phase 6 endpoints behind all middleware', async () => {
    const [registry, source] = await Promise.all([
        read('src/routes/index.js'), read('src/routes/ticketTransfers.routes.js')
    ]);
    const calls = [...source.matchAll(/router\.(get|post)\('([^']+)'/g)]
        .map((match) => `${match[1]} ${match[2]}`);
    assert.deepEqual(calls, [
        'get /tickets/:id/transfer-targets',
        'post /tickets/:id/transfers',
        'get /tickets/:id/transfers',
        'get /ticket-transfers',
        'post /ticket-transfers/:id/accept',
        'post /ticket-transfers/:id/cancel',
        'get /ticket-transfers/:id'
    ]);
    for (const middleware of [
        'authenticateAccessToken', 'requireActiveUser', 'requireEffectiveMembership',
        'parseTicketId', 'parseTransferId', 'parseIfMatch', 'parseInitiateTransfer',
        'parseAcceptTransfer', 'parseCancelTransfer', 'parseTransferListQuery',
        'parseTransferHistoryQuery', 'parseTransferTargetsQuery'
    ]) assert.match(source, new RegExp(middleware));
    assert.match(registry, /createTicketTransferRoutes/);
    assert.ok(registry.lastIndexOf('createTicketTransferRoutes') < registry.lastIndexOf('createTicketRoutes'));
    assert.doesNotMatch(source, /mongoose|withTransaction|findOne|findById|ROOM_MANAGER|SUPER_ADMIN/);
    assert.doesNotMatch(source, /recall|reject|reopen|delete|message|attachment|category|pin/i);
});

test('OpenAPI operations, route source and API route map stay consistent', async () => {
    const [documentText, routeSource, routeMap] = await Promise.all([
        read('docs/openapi/tickets-phase6-transfers.yaml'),
        read('src/routes/ticketTransfers.routes.js'),
        read('docs/api-route-map.md')
    ]);
    const document = JSON.parse(documentText);
    const canonical = new Set();
    for (const [pathName, item] of Object.entries(document.paths)) {
        for (const method of ['get', 'post']) if (item[method]) canonical.add(`${method} ${pathName.replaceAll('{id}', ':id')}`);
    }
    const routes = new Set([...routeSource.matchAll(/router\.(get|post)\('([^']+)'/g)]
        .map((match) => `${match[1]} ${match[2]}`));
    assert.deepEqual(routes, canonical);
    for (const route of canonical) {
        const [method, relativePath] = route.split(' ');
        const marker = `${String.fromCharCode(96)}/api${relativePath}${String.fromCharCode(96)}`;
        assert.ok(routeMap.includes(`| ${method.toUpperCase()} | ${marker} |`));
    }
});

test('Phase 6 remains CommonJS and introduces no forbidden later-phase surface', async () => {
    const files = [
        'src/routes/ticketTransfers.routes.js',
        'src/modules/tickets/transfers/controllers/TicketTransferController.js',
        'src/modules/tickets/transfers/services/TicketTransferService.js',
        'src/modules/tickets/transfers/services/TicketTransferQueryService.js',
        'src/modules/tickets/transfers/services/TicketTransferTargetService.js'
    ];
    const sources = await Promise.all(files.map(read));
    for (const source of sources) {
        assert.doesNotMatch(source, /(^|\n)\s*(?:import\s|export\s)/m);
        assert.match(source, /require\(|module\.exports/);
    }
    const combined = sources.join('\n');
    assert.doesNotMatch(combined, /attachment|file upload|notification|event outbox/i);
});
