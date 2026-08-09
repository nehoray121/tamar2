const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const Ticket = require('../src/modules/tickets/models/Ticket.js');
const TicketHistory = require('../src/modules/tickets/models/TicketHistory.js');
const TicketBoardCategory = require('../src/modules/tickets/boards/models/TicketBoardCategory.js');
const TicketBoardItemState = require('../src/modules/tickets/boards/models/TicketBoardItemState.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const { createPhase7aFixture } = require('./helpers/phase7aFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;
const categoryQuery = (overrides = {}) => ({
    page: 1, limit: 100, search: '', includeArchived: false,
    sortBy: 'name', sortDirection: 'asc', ...overrides
});
const boardQuery = (overrides = {}) => ({
    page: 1, limit: 25, search: '', categoryId: null, categoryMode: 'ALL', pinMode: 'ALL',
    sortBy: 'updatedAt', sortDirection: 'desc', ...overrides
});

before(async () => { await connectTestDatabase(); services = createServiceContainer({ logger }); });
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('category model is shared, scoped, normalized and protected by focused indexes', async () => {
    const data = await createPhase7aFixture(services, 'category-model');
    const category = await services.tickets.boardCategoryService.create(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN',
        { name: '  דחוף   מאוד ', normalizedName: 'ignored', description: 'לטיפול', color: '#1A2B3C' }
    );
    assert.equal(category.name, 'דחוף מאוד');
    assert.equal(category.version, 1);
    const stored = await TicketBoardCategory.findById(category.id).lean();
    assert.equal(stored.normalizedName, 'דחוף מאוד');
    assert.equal(stored.isActive, true);
    assert.equal(stored.createdBy.toString(), data.users.sourceUser._id.toString());
    assert.equal(stored.userId, undefined);
    const names = TicketBoardCategory.schema.indexes().map(([, options]) => options.name);
    assert.ok(names.includes('uniq_active_board_category_name'));
    await assert.rejects(
        services.tickets.boardCategoryService.create(data.users.sourceManager._id, data.rooms.a._id, 'OPEN', {
            name: 'דחוף מאוד', normalizedName: 'ignored', description: null, color: null
        }),
        (error) => error.code === 'BOARD_CATEGORY_DUPLICATE'
    );
    const otherBoard = await services.tickets.boardCategoryService.create(
        data.users.sourceUser._id, data.rooms.a._id, 'CLOSED',
        { name: 'דחוף מאוד', normalizedName: 'ignored', description: null, color: null }
    );
    assert.equal(otherBoard.boardType, 'CLOSED');
});

test('category lifecycle uses optimistic concurrency and remains visible to Room participants', async () => {
    const data = await createPhase7aFixture(services, 'category-lifecycle');
    const events = [];
    services.tickets.boardRealtimePublisher.io = { to: (rooms) => ({ emit: (event, payload) => events.push({ rooms, event, payload }) }) };
    const created = await services.tickets.boardCategoryService.create(data.users.sourceUser._id, data.rooms.a._id, 'OPEN', {
        name: 'בדיקות', normalizedName: 'ignored', description: null, color: '#3366FF'
    });
    const managerList = await services.tickets.boardCategoryService.list(
        data.users.sourceManager._id, data.rooms.a._id, 'OPEN', categoryQuery()
    );
    assert.equal(managerList.items[0].id, created.id);
    await assert.rejects(
        services.tickets.boardCategoryService.update(data.users.sourceUser._id, data.rooms.a._id, 'OPEN', created.id, 9, { description: 'חדש' }),
        (error) => error.code === 'BOARD_CATEGORY_VERSION_CONFLICT'
    );
    const updated = await services.tickets.boardCategoryService.update(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', created.id, 1, { description: 'חדש' }
    );
    assert.equal(updated.version, 2);
    const archived = await services.tickets.boardCategoryService.archive(
        data.users.sourceManager._id, data.rooms.a._id, 'OPEN', created.id, 2
    );
    assert.equal(archived.isActive, false);
    assert.equal(archived.version, 3);
    assert.equal((await services.tickets.boardCategoryService.list(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', categoryQuery()
    )).items.length, 0);
    assert.equal((await services.tickets.boardCategoryService.list(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', categoryQuery({ includeArchived: true })
    )).items.length, 1);
    assert.deepEqual(events.map((entry) => entry.event), [
        'board:category-created', 'board:category-updated', 'board:category-archived'
    ]);
});

test('virtual state persists only on effective mutation and pin/category state is shared', async () => {
    const data = await createPhase7aFixture(services, 'state');
    const ticketBefore = await Ticket.findById(data.ticket.id).lean();
    const historyBefore = await TicketHistory.countDocuments({ ticketId: data.ticket.id });
    const category = await services.tickets.boardCategoryService.create(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN',
        { name: 'חשוב', normalizedName: 'ignored', description: null, color: '#AA5500' }
    );
    const virtual = await services.tickets.boardItemStateService.get(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', data.ticket.id
    );
    assert.deepEqual({ category: virtual.category, isPinned: virtual.isPinned, pinnedAt: virtual.pinnedAt, version: virtual.version }, {
        category: null, isPinned: false, pinnedAt: null, version: 0
    });
    assert.equal(await TicketBoardItemState.countDocuments(), 0);
    const changed = await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', data.ticket.id, 0,
        { categoryId: category.id, isPinned: true }
    );
    assert.equal(changed.version, 1);
    assert.equal(changed.isPinned, true);
    assert.equal(changed.category.id, category.id);
    const shared = await services.tickets.boardItemStateService.get(
        data.users.sourceManager._id, data.rooms.a._id, 'OPEN', data.ticket.id
    );
    assert.equal(shared.version, 1);
    assert.equal(shared.isPinned, true);
    await assert.rejects(
        services.tickets.boardItemStateService.mutate(data.users.sourceManager._id, data.rooms.a._id, 'OPEN', data.ticket.id, 1, { isPinned: true }),
        (error) => error.code === 'EMPTY_BOARD_STATE_UPDATE'
    );
    const unpinned = await services.tickets.boardItemStateService.mutate(
        data.users.sourceManager._id, data.rooms.a._id, 'OPEN', data.ticket.id, 1,
        { categoryId: null, isPinned: false }
    );
    assert.equal(unpinned.version, 2);
    assert.equal(unpinned.category, null);
    assert.equal(unpinned.pinnedAt, null);
    const ticketAfter = await Ticket.findById(data.ticket.id).lean();
    assert.equal(ticketAfter.version, ticketBefore.version);
    assert.equal(ticketAfter.updatedAt.toISOString(), ticketBefore.updatedAt.toISOString());
    assert.equal(await TicketHistory.countDocuments({ ticketId: data.ticket.id }), historyBefore);
});

test('OPEN list filters and sorts shared state in MongoDB before pagination', async () => {
    const data = await createPhase7aFixture(services, 'query');
    const second = await services.tickets.ticketService.create(data.users.sourceManager._id, {
        roomId: String(data.rooms.a._id), subject: 'Second board ticket', description: 'search-safe', priority: 'HIGH'
    });
    const category = await services.tickets.boardCategoryService.create(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN',
        { name: 'מסווג', normalizedName: 'ignored', description: null, color: null }
    );
    await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', data.ticket.id, 0,
        { categoryId: category.id, isPinned: true }
    );
    const firstPage = await services.tickets.boardQueryService.list(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', boardQuery({ limit: 1 })
    );
    assert.equal(firstPage.items[0].ticket.id, data.ticket.id);
    assert.equal(firstPage.items[0].boardState.isPinned, true);
    assert.equal(firstPage.pagination.totalItems, 2);
    const filtered = await services.tickets.boardQueryService.list(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', boardQuery({
            categoryId: category.id, categoryMode: 'CATEGORIZED', pinMode: 'PINNED'
        })
    );
    assert.equal(filtered.pagination.totalItems, 1);
    assert.equal(filtered.items[0].ticket.id, data.ticket.id);
    const unpinned = await services.tickets.boardQueryService.list(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', boardQuery({ pinMode: 'UNPINNED' })
    );
    assert.deepEqual(unpinned.items.map((item) => item.ticket.id), [second.id]);
});

test('state identity and eligibility remain isolated by Room and board type', async () => {
    const data = await createPhase7aFixture(services, 'isolation');
    await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', data.ticket.id, 0, { isPinned: true }
    );
    await assert.rejects(
        services.tickets.boardItemStateService.get(data.users.destinationUser._id, data.rooms.b._id, 'OPEN', data.ticket.id),
        (error) => error.code === 'BOARD_ITEM_NOT_FOUND'
    );
    await assert.rejects(
        services.tickets.boardItemStateService.get(data.users.sourceUser._id, data.rooms.a._id, 'CLOSED', data.ticket.id),
        (error) => error.code === 'BOARD_ITEM_NOT_FOUND'
    );
    assert.equal(await TicketBoardItemState.countDocuments(), 1);
});

test('concurrent first state mutations persist exactly one version-one document', async () => {
    const data = await createPhase7aFixture(services, 'concurrency');
    const results = await Promise.allSettled([
        services.tickets.boardItemStateService.mutate(
            data.users.sourceUser._id, data.rooms.a._id, 'OPEN', data.ticket.id, 0, { isPinned: true }
        ),
        services.tickets.boardItemStateService.mutate(
            data.users.sourceManager._id, data.rooms.a._id, 'OPEN', data.ticket.id, 0, { isPinned: true }
        )
    ]);
    assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(results.filter((item) => item.status === 'rejected')[0].reason.code, 'BOARD_STATE_VERSION_CONFLICT');
    assert.equal(await TicketBoardItemState.countDocuments(), 1);
    assert.equal((await TicketBoardItemState.findOne().lean()).version, 1);
});

test('OPEN and CLOSED retain independent state without copying on closure', async () => {
    const data = await createPhase7aFixture(services, 'closed');
    await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id, data.rooms.a._id, 'OPEN', data.ticket.id, 0, { isPinned: true }
    );
    await services.tickets.ticketService.close(
        data.users.sourceManager._id, data.ticket.id, 1, 'Resolved for closed board verification'
    );
    const closed = await services.tickets.boardItemStateService.get(
        data.users.sourceUser._id, data.rooms.a._id, 'CLOSED', data.ticket.id
    );
    assert.equal(closed.version, 0);
    assert.equal(closed.isPinned, false);
    const list = await services.tickets.boardQueryService.list(
        data.users.sourceUser._id, data.rooms.a._id, 'CLOSED',
        boardQuery({ sortBy: 'closedAt' })
    );
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0].ticket.id, data.ticket.id);
    assert.equal(await TicketBoardItemState.countDocuments({ ticketId: data.ticket.id }), 1);
});

test('one Transfer has independent EXTERNAL_SENT and EXTERNAL_RECEIVED shared states', async () => {
    const data = await createPhase7aFixture(services, 'external');
    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id, data.ticket.id, 1,
        { destinationRoomId: data.rooms.b._id, reason: 'External Board independence verification' }
    );
    const transferId = initiated.transfer.id;
    const sentCategory = await services.tickets.boardCategoryService.create(
        data.users.sourceUser._id, data.rooms.a._id, 'EXTERNAL_SENT',
        { name: 'נשלח', normalizedName: 'ignored', description: null, color: null }
    );
    const receivedCategory = await services.tickets.boardCategoryService.create(
        data.users.destinationUser._id, data.rooms.b._id, 'EXTERNAL_RECEIVED',
        { name: 'התקבל', normalizedName: 'ignored', description: null, color: null }
    );
    await services.tickets.boardItemStateService.mutate(
        data.users.sourceUser._id, data.rooms.a._id, 'EXTERNAL_SENT', transferId, 0,
        { categoryId: sentCategory.id, isPinned: true }
    );
    const receivedVirtual = await services.tickets.boardItemStateService.get(
        data.users.destinationUser._id, data.rooms.b._id, 'EXTERNAL_RECEIVED', transferId
    );
    assert.equal(receivedVirtual.version, 0);
    assert.equal(receivedVirtual.isPinned, false);
    await services.tickets.boardItemStateService.mutate(
        data.users.destinationUser._id, data.rooms.b._id, 'EXTERNAL_RECEIVED', transferId, 0,
        { categoryId: receivedCategory.id }
    );
    const externalQuery = boardQuery({ sortBy: 'initiatedAt' });
    const [sent, received] = await Promise.all([
        services.tickets.boardQueryService.list(data.users.sourceUser._id, data.rooms.a._id, 'EXTERNAL_SENT', externalQuery),
        services.tickets.boardQueryService.list(data.users.destinationUser._id, data.rooms.b._id, 'EXTERNAL_RECEIVED', externalQuery)
    ]);
    assert.equal(sent.items[0].transfer.id, transferId);
    assert.equal(sent.items[0].boardState.category.id, sentCategory.id);
    assert.equal(sent.items[0].boardState.isPinned, true);
    assert.equal(received.items[0].boardState.category.id, receivedCategory.id);
    assert.equal(received.items[0].boardState.isPinned, false);
    assert.equal(await TicketBoardItemState.countDocuments({ transferId }), 2);
});