const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const TicketBoardCategory = require('../src/modules/tickets/boards/models/TicketBoardCategory.js');
const TicketBoardItemState = require('../src/modules/tickets/boards/models/TicketBoardItemState.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { createPhase7aFixture } = require('./helpers/phase7aFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
const boardQuery = (overrides = {}) => ({
    page: 1,
    limit: 25,
    search: '',
    categoryId: null,
    categoryMode: 'ALL',
    pinMode: 'ALL',
    sortBy: 'initiatedAt',
    sortDirection: 'desc',
    ...overrides
});

before(async () => {
    await connectTestDatabase();
    services = createServiceContainer({ logger });
});
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('all approved roles have the same Room-scoped Board mutation authority', async () => {
    const data = await createPhase7aFixture(services, 'board-roles');
    const actors = [
        data.users.sourceUser,
        data.users.sourceManager,
        data.users.systemAdmin,
        data.users.superAdmin
    ];

    for (const [index, actor] of actors.entries()) {
        const category = await services.tickets.boardCategoryService.create(
            actor._id,
            data.rooms.a._id,
            'OPEN',
            { name: 'Role category ' + index, description: null, color: null }
        );
        const archived = await services.tickets.boardCategoryService.archive(
            actor._id,
            data.rooms.a._id,
            'OPEN',
            category.id,
            category.version
        );
        assert.equal(archived.isActive, false);
    }

    const sharedCategory = await services.tickets.boardCategoryService.create(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        { name: 'Shared role category', description: null, color: '#3366FF' }
    );
    const first = await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id,
        0,
        { categoryId: sharedCategory.id, isPinned: true }
    );
    const second = await services.tickets.boardItemStateService.mutate(
        data.users.sourceManager._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id,
        first.version,
        { isPinned: false }
    );
    const third = await services.tickets.boardItemStateService.mutate(
        data.users.systemAdmin._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id,
        second.version,
        { isPinned: true }
    );
    const fourth = await services.tickets.boardItemStateService.mutate(
        data.users.superAdmin._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id,
        third.version,
        { categoryId: null }
    );
    assert.equal(fourth.version, 4);
    assert.equal(fourth.isPinned, true);
    assert.equal(fourth.category, null);

    for (const actor of [data.users.destinationUser, data.users.unrelated]) {
        await assert.rejects(
            services.tickets.boardCategoryService.list(actor._id, data.rooms.a._id, 'OPEN', {
                page: 1,
                limit: 100,
                search: '',
                includeArchived: false,
                sortBy: 'name',
                sortDirection: 'asc'
            }),
            (error) => error.code === 'BOARD_ACCESS_FORBIDDEN'
        );
    }
});

test('duplicate creation is concurrency-safe and archived references remain removable', async () => {
    const data = await createPhase7aFixture(services, 'board-archive');
    const duplicateResults = await Promise.allSettled([
        services.tickets.boardCategoryService.create(
            data.users.sourceUser._id,
            data.rooms.a._id,
            'OPEN',
            { name: ' Concurrent   category ', description: null, color: null }
        ),
        services.tickets.boardCategoryService.create(
            data.users.sourceManager._id,
            data.rooms.a._id,
            'OPEN',
            { name: 'concurrent category', description: null, color: null }
        )
    ]);
    assert.equal(duplicateResults.filter((result) => result.status === 'fulfilled').length, 1);
    const duplicateFailure = duplicateResults.find((result) => result.status === 'rejected');
    assert.equal(duplicateFailure.reason.code, 'BOARD_CATEGORY_DUPLICATE');

    const category = duplicateResults.find((result) => result.status === 'fulfilled').value;
    const assigned = await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id,
        0,
        { categoryId: category.id }
    );
    await services.tickets.boardCategoryService.archive(
        data.users.sourceManager._id,
        data.rooms.a._id,
        'OPEN',
        category.id,
        category.version
    );
    const preserved = await services.tickets.boardItemStateService.get(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id
    );
    assert.equal(preserved.category.id, category.id);
    assert.equal(preserved.category.isActive, false);

    const secondTicket = await services.tickets.ticketService.create(data.users.sourceManager._id, {
        roomId: String(data.rooms.a._id),
        subject: 'Archived category assignment target',
        description: 'Archived categories cannot be newly assigned',
        priority: 'LOW'
    });
    await assert.rejects(
        services.tickets.boardItemStateService.mutate(
            data.users.sourceUser._id,
            data.rooms.a._id,
            'OPEN',
            secondTicket.id,
            0,
            { categoryId: category.id }
        ),
        (error) => error.code === 'BOARD_CATEGORY_ARCHIVED'
    );
    const removed = await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id,
        assigned.version,
        { categoryId: null }
    );
    assert.equal(removed.category, null);
    assert.equal(await TicketBoardCategory.countDocuments({ isActive: false }), 1);
});

test('A to B to C creates four independent external Board item contexts by Transfer ID', async () => {
    const data = await createPhase7aFixture(services, 'board-chain');
    const first = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Board chain first transfer' }
    );
    await services.tickets.transferService.accept(
        data.users.destinationManager._id,
        first.transfer.id,
        2
    );
    const second = await services.tickets.transferService.initiate(
        data.users.destinationManager._id,
        data.ticket.id,
        3,
        { destinationRoomId: data.rooms.c._id, reason: 'Board chain second transfer' }
    );

    const contexts = [
        [data.users.sourceUser, data.rooms.a, 'EXTERNAL_SENT', first.transfer.id],
        [data.users.destinationUser, data.rooms.b, 'EXTERNAL_RECEIVED', first.transfer.id],
        [data.users.destinationUser, data.rooms.b, 'EXTERNAL_SENT', second.transfer.id],
        [data.users.thirdManager, data.rooms.c, 'EXTERNAL_RECEIVED', second.transfer.id]
    ];
    for (const [actor, room, boardType, transferId] of contexts) {
        const state = await services.tickets.boardItemStateService.mutate(
            actor._id,
            room._id,
            boardType,
            transferId,
            0,
            { isPinned: true }
        );
        assert.equal(state.version, 1);
    }

    const [aSent, bReceived, bSent, cReceived] = await Promise.all(contexts.map(
        ([actor, room, boardType]) => services.tickets.boardQueryService.list(
            actor._id,
            room._id,
            boardType,
            boardQuery()
        )
    ));
    assert.deepEqual(aSent.items.map((item) => item.transfer.id), [first.transfer.id]);
    assert.deepEqual(bReceived.items.map((item) => item.transfer.id), [first.transfer.id]);
    assert.deepEqual(bSent.items.map((item) => item.transfer.id), [second.transfer.id]);
    assert.deepEqual(cReceived.items.map((item) => item.transfer.id), [second.transfer.id]);

    const states = await TicketBoardItemState.find({ ticketId: data.ticket.id }).lean();
    assert.equal(states.length, 4);
    assert.equal(states.filter((state) => String(state.transferId) === first.transfer.id).length, 2);
    assert.equal(states.filter((state) => String(state.transferId) === second.transfer.id).length, 2);
});

test('realtime Board events target exact hierarchy rooms and expose only minimal metadata', async () => {
    const data = await createPhase7aFixture(services, 'board-realtime');
    const emitted = [];
    services.tickets.boardRealtimePublisher.setIo({
        to(rooms) {
            return {
                emit(event, payload) {
                    emitted.push({ rooms, event, payload });
                }
            };
        }
    });

    const category = await services.tickets.boardCategoryService.create(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        { name: 'Realtime category', description: 'must not be emitted', color: '#123456' }
    );
    await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        data.ticket.id,
        0,
        { categoryId: category.id, isPinned: true }
    );

    assert.deepEqual(emitted.map((entry) => entry.event), [
        'board:category-created',
        'board:item-state-updated'
    ]);
    for (const entry of emitted) {
        assert.deepEqual(new Set(entry.rooms), new Set([
            'system:' + data.system._id,
            'subEnvironment:' + data.subEnvironment._id,
            'room:' + data.rooms.a._id
        ]));
        for (const sensitive of ['name', 'description', 'color', 'createdBy', 'updatedBy', 'pinnedBy', 'categoryChangedBy']) {
            assert.equal(Object.hasOwn(entry.payload, sensitive), false);
        }
    }

    services.tickets.boardRealtimePublisher.setIo({
        to() {
            return { emit() { throw new Error('transport unavailable'); } };
        }
    });
    const persisted = await services.tickets.boardCategoryService.update(
        data.users.sourceUser._id,
        data.rooms.a._id,
        'OPEN',
        category.id,
        1,
        { description: 'Persistence must survive realtime failure' }
    );
    assert.equal(persisted.version, 2);
});
