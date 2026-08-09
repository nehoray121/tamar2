const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketBoardCategory = require('../src/modules/tickets/boards/models/TicketBoardCategory.js');
const TicketBoardItemState = require('../src/modules/tickets/boards/models/TicketBoardItemState.js');
const verifyArchitecture = require('../scripts/verify-architecture.js');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('all seven Board operations exist only in the canonical central route file', () => {
    const source = read('src/routes/ticketBoards.routes.js');
    const calls = [...source.matchAll(/router\.(get|post|patch|delete)\(`\$\{board\}([^`]*)`/gu)]
        .map((match) => `${match[1]} ${match[2]}`);
    assert.deepEqual(calls, [
        'get /items', 'get /categories', 'post /categories',
        'patch /categories/:categoryId', 'post /categories/:categoryId/archive',
        'get /items/:itemId/state', 'patch /items/:itemId/state'
    ]);
    for (const middleware of [
        'authenticateAccessToken', 'requireProvisionedUser', 'requireActiveUser',
        'requireEffectiveMembership', 'parseBoardParams', 'parseStateIfMatch', 'parseCategoryIfMatch'
    ]) assert.match(source, new RegExp(middleware));
    assert.doesNotMatch(source, /mongoose|findOne|findById|\.emit\(|ROOM_MANAGER|SYSTEM_ADMIN|SUPER_ADMIN/);
    assert.match(read('src/routes/index.js'), /createTicketBoardRoutes/);
    assert.equal(verifyArchitecture().result, 'PASS');
});

test('OpenAPI 3.1 and route map document exactly the seven implemented Board operations', () => {
    const document = JSON.parse(read('docs/openapi/tickets-phase8-boards.yaml'));
    assert.equal(document.openapi, '3.1.0');
    assert.deepEqual(document.components.parameters.BoardType.schema.enum, [
        'OPEN', 'CLOSED', 'EXTERNAL_SENT', 'EXTERNAL_RECEIVED'
    ]);
    const operations = Object.entries(document.paths).flatMap(([pathName, pathItem]) =>
        ['get', 'post', 'patch', 'delete'].filter((method) => pathItem[method]).map((method) => `${method} ${pathName}`)
    );
    assert.equal(operations.length, 7);
    const routeMap = read('docs/api-route-map.md');
    for (const operation of operations) {
        const [method, pathName] = operation.split(' ');
        const expressPath = pathName.replaceAll('{roomId}', ':roomId').replaceAll('{boardType}', ':boardType')
            .replaceAll('{categoryId}', ':categoryId').replaceAll('{itemId}', ':itemId');
        assert.ok(routeMap.includes(`| ${method.toUpperCase()} | \`/api${expressPath}\` |`), operation);
    }
    assert.equal(document['x-board-rules'].noPersonalOrdering, true);
    assert.equal(document['x-realtime-events'].length, 4);
});

test('Board schemas contain shared identity only and Ticket stays free of global Board fields', () => {
    const categoryPaths = Object.keys(TicketBoardCategory.schema.paths);
    const statePaths = Object.keys(TicketBoardItemState.schema.paths);
    for (const forbidden of ['userId', 'personalOrder', 'userOrder', 'position', 'rank']) {
        assert.ok(!categoryPaths.includes(forbidden));
        assert.ok(!statePaths.includes(forbidden));
    }
    for (const forbidden of ['categoryId', 'isPinned', 'pinnedAt', 'pinnedBy']) {
        assert.equal(Ticket.schema.path(forbidden), undefined);
    }
    const categoryIndexes = TicketBoardCategory.schema.indexes().map(([, options]) => options.name);
    const stateIndexes = TicketBoardItemState.schema.indexes().map(([, options]) => options.name);
    assert.ok(categoryIndexes.includes('uniq_active_board_category_name'));
    assert.ok(stateIndexes.includes('uniq_ticket_board_state'));
    assert.ok(stateIndexes.includes('uniq_transfer_board_state'));
    assert.ok(stateIndexes.includes('board_state_pin_order'));
    assert.ok(stateIndexes.includes('board_state_category_filter'));
});

test('all Board source remains CommonJS and exposes no future Phase surface', () => {
    const files = fs.readdirSync(path.join(root, 'src/modules/tickets/boards'), { recursive: true })
        .filter((file) => String(file).endsWith('.js'))
        .map((file) => path.join(root, 'src/modules/tickets/boards', String(file)));
    const sources = files.map((file) => fs.readFileSync(file, 'utf8'));
    for (const source of sources) {
        assert.doesNotMatch(source, /(^|\n)\s*(?:import\s|export\s)/mu);
        assert.match(source, /require\(|module\.exports/);
    }
    const combined = sources.join('\n');
    assert.doesNotMatch(combined, /personalOrder|userOrder|manualOrder|dragOrder|sortIndex|userBoardPreference|attachment|notification/i);
});
