const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const read = (file) => readFile(path.join(projectRoot, file), 'utf8');

test('Phase 7A OpenAPI is JSON-compatible OpenAPI 3.1 and documents exactly four operations', async () => {
    const document = JSON.parse(await read('docs/openapi/tickets-phase7a-chat.yaml'));
    assert.equal(document.openapi, '3.1.0');
    assert.deepEqual(Object.keys(document.paths).sort(), [
        '/tickets/{id}/messages', '/tickets/{id}/messages/{messageId}'
    ]);
    const operations = Object.values(document.paths).flatMap((entry) =>
        Object.entries(entry).filter(([method]) => ['get', 'post', 'patch', 'delete'].includes(method))
    );
    assert.equal(operations.length, 4);
    assert.ok(document.paths['/tickets/{id}/messages'].post.responses['201']);
    assert.ok(document.paths['/tickets/{id}/messages'].post.responses['200']);
    assert.ok(document.paths['/tickets/{id}/messages/{messageId}'].patch.responses['428']);
    assert.ok(document.paths['/tickets/{id}/messages/{messageId}'].delete.responses['409']);
    assert.match(document.info.description, /transfers|closure|canWriteChat|isReadOnly/i);
    assert.deepEqual(document['x-realtime-events'].events, [
        'chat:message-created', 'chat:message-updated', 'chat:message-deleted'
    ]);
});

test('central Message router exposes exactly the approved endpoints behind every required middleware', async () => {
    const [registry, source] = await Promise.all([
        read('src/routes/index.js'), read('src/routes/ticketMessages.routes.js')
    ]);
    const calls = [...source.matchAll(/router\.(get|post|patch|delete)\('([^']+)'/g)]
        .map((match) => `${match[1]} ${match[2]}`);
    assert.deepEqual(calls, [
        'get /tickets/:id/messages',
        'post /tickets/:id/messages',
        'patch /tickets/:id/messages/:messageId',
        'delete /tickets/:id/messages/:messageId'
    ]);
    for (const middleware of [
        'authenticateAccessToken', 'requireProvisionedUser', 'requireActiveUser',
        'requireEffectiveMembership', 'parseTicketId', 'parseMessageId',
        'parseMessageIfMatch', 'parseCreateMessage', 'parseEditMessage',
        'parseDeleteMessage', 'parseMessageListQuery'
    ]) assert.match(source, new RegExp(middleware));
    assert.match(registry, /createTicketMessageRoutes/);
    assert.ok(registry.lastIndexOf('createTicketMessageRoutes') < registry.lastIndexOf('createTicketTransferRoutes'));
    assert.ok(registry.lastIndexOf('createTicketMessageRoutes') < registry.lastIndexOf('createTicketRoutes'));
    assert.doesNotMatch(source, /mongoose|findOne|findById|ROOM_MANAGER|SYSTEM_ADMIN|SUPER_ADMIN|\.emit\(/);
});

test('OpenAPI operations, route source and API route map remain exactly consistent', async () => {
    const [documentText, routeSource, routeMap] = await Promise.all([
        read('docs/openapi/tickets-phase7a-chat.yaml'),
        read('src/routes/ticketMessages.routes.js'),
        read('docs/api-route-map.md')
    ]);
    const document = JSON.parse(documentText);
    const canonical = new Set();
    for (const [pathName, item] of Object.entries(document.paths)) {
        for (const method of ['get', 'post', 'patch', 'delete']) {
            if (item[method]) canonical.add(`${method} ${pathName.replace('{id}', ':id').replace('{messageId}', ':messageId')}`);
        }
    }
    const routes = new Set([...routeSource.matchAll(/router\.(get|post|patch|delete)\('([^']+)'/g)]
        .map((match) => `${match[1]} ${match[2]}`));
    assert.deepEqual(routes, canonical);
    for (const route of canonical) {
        const [method, relativePath] = route.split(' ');
        assert.ok(routeMap.includes(`| ${method.toUpperCase()} | \`/api${relativePath}\` |`), route);
    }
    assert.equal(routeMap.split('\n').filter((line) => /^\| (?:GET|POST|PUT|PATCH|DELETE) \|/.test(line)).length, 40);
});

test('architecture remains CommonJS, centralized and free of forbidden chat extensions', async () => {
    const files = [
        'src/routes/ticketMessages.routes.js',
        'src/modules/tickets/messages/controllers/TicketMessageController.js',
        'src/modules/tickets/messages/repositories/TicketMessageRepository.js',
        'src/modules/tickets/messages/services/TicketMessageService.js',
        'src/modules/tickets/messages/services/TicketMessageQueryService.js',
        'src/modules/tickets/messages/services/TicketMessageRealtimePublisher.js'
    ];
    const sources = await Promise.all(files.map(read));
    for (const source of sources) {
        assert.doesNotMatch(source, /(^|\n)\s*(?:import\s|export\s)/m);
        assert.match(source, /require\(|module\.exports/);
    }
    const combined = sources.join('\n');
    assert.doesNotMatch(combined, /attachment|upload|download|GridFS|S3|MinIO|internal.?note|private.?message|hidden.?message|reaction|thread|mention|read.?receipt/i);
    const verifyArchitecture = require('../scripts/verify-architecture.js');
    assert.equal(verifyArchitecture().result, 'PASS');
});

test('no file dependency, attachment model, nested routes or frontend integration was introduced', async () => {
    const packageJson = JSON.parse(await read('package.json'));
    assert.equal(packageJson.dependencies?.multer, undefined);
    const sourceFiles = fs.readdirSync(path.join(projectRoot, 'src'), { recursive: true })
        .map(String).map((name) => name.replaceAll('\\', '/'));
    assert.ok(sourceFiles.some((name) => name.endsWith('modules/tickets/messages/models/TicketMessage.js')));
    assert.ok(!sourceFiles.some((name) => /(?:Attachment|File|InternalNote|Reaction|ReadReceipt)\.js$/i.test(name)));
    assert.ok(!sourceFiles.some((name) => name.includes('/routes/')));
});
