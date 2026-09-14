'use strict';
// Unit tests: execute the real validator and pipeline builder with model metadata
// doubles. No MongoDB connection, seed, database writes or live records are used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const cache = new Map();
class ObjectId {
    constructor(value) { this.value = String(value); }
    toString() { return this.value; }
}
const mongoose = {
    Types: { ObjectId },
    isValidObjectId: value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)
};
function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const requireLocal = request => {
        if (request === 'mongoose') return mongoose;
        if (/TicketBoardCategory\.js$/.test(request)) return { collection: { name: 'ticketboardcategories' } };
        if (/TicketBoardItemState\.js$/.test(request)) return { collection: { name: 'ticketboarditemstates' } };
        if (request.startsWith('.')) return load(path.resolve(path.dirname(file), request));
        return require(request);
    };
    const fn = vm.runInThisContext('(function(require,module,exports,__filename,__dirname){\n' + fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '') + '\n})', { filename: file });
    fn(requireLocal, module, module.exports, file, path.dirname(file));
    return module.exports;
}
const { parseBoardListQuery } = load(path.join(root, 'src/modules/tickets/boards/domain/board.validators.js'));
const Service = load(path.join(root, 'src/modules/tickets/boards/services/TicketBoardQueryService.js'));
const roomId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const categoryId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const boards = ['OPEN', 'CLOSED', 'EXTERNAL_SENT', 'EXTERNAL_RECEIVED'];
const normalize = value => JSON.parse(JSON.stringify(value));
function parse(boardType, query) {
    const req = { boardParams: { boardType, roomId }, query };
    let error; let calls = 0;
    parseBoardListQuery(req, {}, err => { error = err; calls++; });
    assert.equal(calls, 1, 'middleware must invoke next exactly once');
    if (error) throw error;
    return req.boardQuery;
}
for (const board of boards) {
    test(board + ': priority is validated and retained for every canonical enum', () => {
        for (const priority of ['HIGH', 'MEDIUM', 'LOW', 'CRITICAL']) {
            assert.equal(parse(board, { priority }).priority, priority);
        }
    });
    test(board + ': omitted priority means no priority restriction', () => {
        assert.equal(parse(board, {}).priority, undefined);
    });
    test(board + ': invalid priorities and query injection are rejected', () => {
        for (const priority of ['high', '5', ['HIGH'], { $ne: 'LOW' }]) {
            assert.throws(() => parse(board, { priority }), err => err.code === 'INVALID_BOARD_QUERY');
        }
        assert.throws(() => parse(board, { priority: 'HIGH', userId: roomId }), err => err.code === 'INVALID_BOARD_QUERY');
    });
}
for (const board of ['EXTERNAL_SENT', 'EXTERNAL_RECEIVED']) {
    test(board + ': priority intersects with transfer filters without broadening allowed fields', () => {
        const query = parse(board, { priority: 'MEDIUM', transferStatus: 'PENDING_ACCEPTANCE', externalState: 'PENDING', search: 'בדיקה', categoryId, pinMode: 'PINNED', initiatedFrom: '2026-01-01', initiatedTo: '2026-02-01', sortBy: 'ticketNumber', page: '2', limit: '3' });
        assert.equal(query.priority, 'MEDIUM'); assert.equal(query.categoryId, categoryId);
        assert.equal(query.externalState, 'PENDING'); assert.equal(query.search, 'בדיקה');
        assert.equal(query.page, 2); assert.equal(query.limit, 3);
        assert.throws(() => parse(board, { priority: 'LOW', createdFrom: '2026-01-01' }), err => err.code === 'INVALID_BOARD_QUERY');
        assert.throws(() => parse(board, { priority: 'LOW', initiatedFrom: '2026-02-01', initiatedTo: '2026-01-01' }), err => err.code === 'INVALID_BOARD_QUERY');
    });
    test(board + ': filters the joined Ticket before pagination AND total counting', () => {
        const service = new Service({});
        const query = parse(board, { priority: 'HIGH', page: '2', limit: '2' });
        const pipeline = service.transferPipeline(roomId, board, query);
        const scope = board === 'EXTERNAL_SENT' ? 'sourceRoomId' : 'destinationRoomId';
        assert.equal(String(pipeline[0].$match[scope]), roomId);
        assert.equal(Object.keys(pipeline[0].$match).length, 1);
        const priorityStage = pipeline.findIndex(s => s.$match?.['_ticket.priority']);
        const joinStage = pipeline.findIndex(s => s.$lookup?.from === 'tickets');
        const sortStage = pipeline.findIndex(s => s.$sort);
        const facetStage = pipeline.findIndex(s => s.$facet);
        assert.ok(priorityStage > joinStage && priorityStage < sortStage && priorityStage < facetStage);
        assert.deepEqual(pipeline[priorityStage], { $match: { '_ticket.priority': 'HIGH' } });
        assert.deepEqual(pipeline[facetStage].$facet.items, [{ $skip: 2 }, { $limit: 2 }]);
        assert.deepEqual(pipeline[facetStage].$facet.total, [{ $count: 'count' }]);
        // Removing only the new filter must reproduce the previous, unfiltered pipeline.
        const unfiltered = service.transferPipeline(roomId, board, { ...query, priority: undefined });
        assert.deepEqual(normalize(pipeline.filter((_, i) => i !== priorityStage)), normalize(unfiltered));
        // Fixture evaluation of the actual equality predicate + actual skip/limit.
        const rows = ['LOW','HIGH','MEDIUM','HIGH','HIGH','LOW','HIGH'].map((priority, i) => ({ id: i, _ticket: { priority } }));
        const matches = rows.filter(row => row._ticket.priority === pipeline[priorityStage].$match['_ticket.priority']);
        assert.equal(matches.length, 4);
        const [{ $skip }, { $limit }] = pipeline[facetStage].$facet.items;
        assert.deepEqual(matches.slice($skip, $skip + $limit).map(x => x.id), [4, 6]);
    });
    test(board + ': authorization and category access still run before the query', async () => {
        const steps = [];
        const service = new Service({
            authorizationService: { async authorize(actor, room, type) { steps.push('authorize'); assert.equal(room, roomId); assert.equal(type, board); return { access: { global: false, managedRoomIds: [] } }; } },
            categoryRepository: { async findScoped(id, room, type) { steps.push('category'); assert.equal(id, categoryId); assert.equal(room, roomId); assert.equal(type, board); return { id }; } },
            queryRepository: { async aggregateTransfers(pipeline) { steps.push('query'); assert.ok(pipeline.some(s => s.$match?.['_ticket.priority'] === 'LOW')); return [{ items: [], total: [{ count: 4 }] }]; } },
            capabilityService: { forAuthorizedItem() { return { canChangeCategory: true, canChangePin: true }; } }
        });
        const result = await service.list('actor', roomId, board, parse(board, { priority: 'LOW', categoryId, page: '1', limit: '2' }));
        assert.deepEqual(steps, ['authorize','category','query']);
        assert.equal(result.appliedFilters.priority, 'LOW'); assert.equal(result.pagination.totalItems, 4);
        assert.equal(result.pagination.totalPages, 2); assert.equal(result.pagination.hasNextPage, true);
        service.authorizationService.authorize = async () => { throw Object.assign(new Error('forbidden'), { code: 'BOARD_ACCESS_FORBIDDEN' }); };
        steps.length = 0;
        await assert.rejects(() => service.list('actor', roomId, board, parse(board, { priority: 'LOW' })), err => err.code === 'BOARD_ACCESS_FORBIDDEN');
        assert.deepEqual(steps, []);
    });
}
test('OPEN and CLOSED retain their Ticket-level priority predicate', () => {
    const service = new Service({});
    for (const board of ['OPEN', 'CLOSED']) {
        const pipeline = service.ticketPipeline(roomId, board, parse(board, { priority: 'MEDIUM' }));
        assert.equal(pipeline[0].$match.priority, 'MEDIUM');
        assert.equal(pipeline[0].$match.status, board === 'OPEN' ? 'OPEN' : 'CLOSED');
    }
});
