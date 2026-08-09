const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(projectRoot, file), 'utf8');

const approvedRoutes = [
    'get /tickets/:id/messages',
    'post /tickets/:id/messages',
    'patch /tickets/:id/messages/:messageId',
    'delete /tickets/:id/messages/:messageId'
];

test('all 70 approved Phase 7A requirements have explicit covered traceability rows', () => {
    const matrix = read('docs/phase7a-verification-matrix.md');
    const rows = matrix.split(/\r?\n/).filter((line) => /^\| RQ-\d{3} \|/.test(line));
    assert.equal(rows.length, 70);
    assert.deepEqual(
        rows.map((row) => row.match(/^\| (RQ-\d{3}) \|/)[1]),
        Array.from({ length: 70 }, (_, index) => `RQ-${String(index + 1).padStart(3, '0')}`)
    );
    for (const row of rows) {
        const columns = row.split('|').map((column) => column.trim());
        assert.equal(columns.at(-2), 'covered', `${columns[1]} is not finally covered`);
        const testPath = columns[4].replaceAll('`', '');
        assert.ok(fs.existsSync(path.join(projectRoot, testPath)), `${columns[1]} test file is missing`);
        assert.ok(columns[5].length > 0, `${columns[1]} has no named executable evidence`);
    }
});

test('Phase 7A OpenAPI documents the complete approved chat contract and exclusions', () => {
    const document = JSON.parse(read('docs/openapi/tickets-phase7a-chat.yaml'));
    const operations = [];
    for (const [routePath, route] of Object.entries(document.paths)) {
        for (const method of ['get', 'post', 'patch', 'delete']) {
            if (route[method]) operations.push(`${method} ${routePath.replace('{id}', ':id').replace('{messageId}', ':messageId')}`);
        }
    }
    assert.deepEqual(operations, approvedRoutes);
    const serialized = JSON.stringify(document);
    for (const required of [
        'CanonicalUuidV4', 'before', 'If-Match', 'INVALID_MESSAGE_CURSOR', 'MESSAGE_IDEMPOTENCY_CONFLICT',
        'MESSAGE_NOT_AUTHORED_BY_ACTOR', 'MESSAGE_CANNOT_EDIT_DELETED',
        'MESSAGE_ALREADY_DELETED', 'MESSAGE_VERSION_CONFLICT', 'canWriteChat',
        'isReadOnly', 'chat:message-created', 'chat:message-updated', 'chat:message-deleted'
    ]) assert.ok(serialized.includes(required), required);
    assert.match(document.info.description, /no administrator override/i);
    assert.match(document.info.description, /attachments.+not supported/i);
    assert.doesNotMatch(serialized, /\/attachments|\/uploads|\/internal|\/private/);
});

test('Message routes remain centralized, unique, ordered, and later-phase free', () => {
    const routeDirectory = path.join(projectRoot, 'src', 'routes');
    const routeFiles = fs.readdirSync(routeDirectory).filter((name) => name.endsWith('.js'));
    const definitions = [];
    for (const file of routeFiles) {
        const source = fs.readFileSync(path.join(routeDirectory, file), 'utf8');
        for (const match of source.matchAll(/router\.(get|post|patch|delete)\('([^']+)'/g)) {
            if (match[2].includes('/messages')) definitions.push({ file, route: `${match[1]} ${match[2]}` });
        }
    }
    assert.deepEqual(definitions, approvedRoutes.map((route) => ({
        file: 'ticketMessages.routes.js', route
    })));
    const registry = read('src/routes/index.js');
    assert.ok(registry.lastIndexOf('createTicketMessageRoutes') < registry.lastIndexOf('createTicketTransferRoutes'));
    const messageRoutes = read('src/routes/ticketMessages.routes.js');
    assert.doesNotMatch(messageRoutes, /attachment|upload|download|internal.?note|private.?message|hidden.?message/i);
});

test('OpenAPI route map and Express definitions are identical for Message endpoints', () => {
    const routeMap = read('docs/api-route-map.md');
    const routeSource = read('src/routes/ticketMessages.routes.js');
    const actual = [...routeSource.matchAll(/router\.(get|post|patch|delete)\('([^']+)'/g)]
        .map((match) => `${match[1]} ${match[2]}`);
    assert.deepEqual(actual, approvedRoutes);
    for (const route of approvedRoutes) {
        const [method, relativePath] = route.split(' ');
        assert.ok(routeMap.includes(`| ${method.toUpperCase()} | \`/api${relativePath}\` |`), route);
    }
});

test('test database helper hard-fails outside isolated tamar_test', () => {
    const helper = read('tests/helpers/testDatabase.js');
    assert.match(helper, /const TEST_DATABASE_NAME = 'tamar_test'/);
    assert.match(helper, /process\.env\.NODE_ENV !== 'test'/);
    assert.match(helper, /connectedDatabaseName !== TEST_DATABASE_NAME/);
    const { assertTestIsolation, TEST_DATABASE_NAME } = require('./helpers/testDatabase.js');
    assert.equal(TEST_DATABASE_NAME, 'tamar_test');
    const originalEnvironment = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = 'production';
        assert.throws(assertTestIsolation, /outside NODE_ENV=test/);
    } finally {
        process.env.NODE_ENV = originalEnvironment;
    }
});

test('Phase 7A-V scope contains no frontend integration', () => {
    const backendSources = [
        'src/routes/ticketMessages.routes.js',
        'src/modules/tickets/messages/controllers/TicketMessageController.js',
        'src/modules/tickets/messages/repositories/TicketMessageRepository.js',
        'src/modules/tickets/messages/services/TicketMessageService.js',
        'src/modules/tickets/messages/services/TicketMessageQueryService.js',
        'src/modules/tickets/messages/services/TicketMessageRealtimePublisher.js'
    ].map(read).join('\n');
    assert.doesNotMatch(backendSources, /\.\.\/\.\.\/\.\.\/\.\.\/src\/|tamar-react-app\/src|frontend/i);
    assert.ok(fs.existsSync(path.join(projectRoot, 'docs', 'phase7a-verification-matrix.md')));
});