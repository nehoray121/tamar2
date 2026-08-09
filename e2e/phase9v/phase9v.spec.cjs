const { test, expect } = require('@playwright/test');
const { Phase9VHarness, sleep } = require('./support/harness.cjs');

test.describe.configure({ mode: 'serial' });
let harness;
let sharedCategoryId;

const row = (page, itemId) => page.locator('[data-testid="board-item-row"][data-board-item-id="' + itemId + '"]');
const categoryOption = (page, categoryId) => page.locator('[data-testid="board-category-option"][data-category-id="' + categoryId + '"]');
const categoryEdit = (page, categoryId) => page.locator('[data-testid="board-category-edit"][data-category-id="' + categoryId + '"]');
const openBarePage = async ({ actor = 'A1', authenticated = true } = {}) => {
    const context = await harness.browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'he-IL' });
    harness.contexts.add(context);
    if (authenticated) {
        await context.addInitScript(({ accessToken }) => {
            Object.defineProperty(globalThis, '__TAMAR_AUTH__', {
                configurable: true,
                value: Object.freeze({ getAccessToken: async () => accessToken })
            });
        }, { accessToken: harness.tokens[actor] });
    }
    const page = await context.newPage();
    await page.goto(harness.frontendUrl, { waitUntil: 'domcontentloaded' });
    return { context, page };
};
const waitForSessionStatus = async (page, expected) => {
    await expect.poll(() => page.evaluate(async () => {
        const module = await import('/src/store/session.store.js');
        return module.useSessionStore.getState().authStatus;
    }), { timeout: 15000 }).toBe(expected);
    if (expected === 'authenticated') {
        await expect.poll(() => page.evaluate(async () => {
            const module = await import('/src/store/session.store.js');
            const state = module.useSessionStore.getState();
            return `${state.authStatus}:${state.hierarchyStatus}`;
        }), { timeout: 15000 }).toBe('authenticated:ready');
        await page.waitForTimeout(150);
    }
};
const setRuntimeView = (page, { room = 'a', view = 'open_complaints' } = {}) => page.evaluate(async ({ roomId, currentView }) => {
    const module = await import('/src/store/session.store.js');
    const current = module.useSessionStore.getState();
    const selectedRoom = current.organizationHierarchy.rooms.find((item) => item.id === roomId);
    if (!selectedRoom) throw new Error('Canonical Room is not available in the runtime hierarchy');
    const selectedEnvironment = current.organizationHierarchy.environments.find((item) => item.id === selectedRoom.environmentId);
    module.useSessionStore.setState({
        hasSelectedEnv: true,
        hasSelectedRoom: true,
        selectedEnvironment,
        selectedRoom,
        currentView,
        showEnvModal: false
    });
}, { roomId: harness.fixture.rooms[room].id, currentView: view });

test.beforeAll(async () => {
    harness = await new Phase9VHarness().start();
});

test.afterAll(async () => {
    if (harness) await harness.close();
});

test('P9V-E2E-001 real React OPEN Board uses signed Bearer token, remote JWKS and canonical Room ObjectId', async () => {
    const opened = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const page = opened.page;
    const boardResponse = opened.boardResponse;
    expect(boardResponse.status()).toBe(200);
    expect(boardResponse.url()).toContain('/rooms/' + harness.fixture.rooms.a.id + '/boards/OPEN/items');
    expect(boardResponse.request().headers().authorization).toMatch(/^Bearer [^.]+\.[^.]+\.[^.]+$/);
    await expect(row(page, harness.fixture.tickets.openA)).toBeVisible();
    expect(harness.jwksRequests).toBeGreaterThan(0);

    const statePath = harness.boardPath('a', 'OPEN') + '/items/' + harness.fixture.tickets.openA + '/state';
    const virtual = await harness.api('A1', statePath);
    expect(virtual.response.status).toBe(200);
    expect(virtual.response.headers.get('etag')).toBe('"0"');
    expect(virtual.body.data.version).toBe(0);

    const pin = row(page, harness.fixture.tickets.openA).getByTestId('board-item-pin');
    const pinnedResponse = page.waitForResponse((response) => (
        response.request().method() === 'PATCH'
        && response.url().includes('/items/' + harness.fixture.tickets.openA + '/state')
    ));
    await pin.click();
    expect((await pinnedResponse).status()).toBe(200);
    await expect(pin).toHaveAttribute('aria-pressed', 'true');

    const unpinnedResponse = page.waitForResponse((response) => (
        response.request().method() === 'PATCH'
        && response.url().includes('/items/' + harness.fixture.tickets.openA + '/state')
    ));
    await pin.click();
    expect((await unpinnedResponse).status()).toBe(200);
    await expect(pin).toHaveAttribute('aria-pressed', 'false');
});

test('P9V-E2E-002 category create, update, assignment, archive and archived-reference removal use real UI and REST', async () => {
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    await page.getByTestId('board-category-menu').click();
    await page.getByTestId('board-category-create').click();
    await page.getByTestId('board-category-name').fill('P9V Shared UI');
    const createResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().endsWith('/boards/OPEN/categories')
    ));
    await page.getByTestId('board-category-submit').click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    sharedCategoryId = (await createResponse.json()).data.id;

    await page.getByTestId('board-category-create').click();
    await page.getByTestId('board-category-name').fill('P9V Shared UI');
    const duplicateResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().endsWith('/boards/OPEN/categories')
    ));
    await page.getByTestId('board-category-submit').click();
    expect((await duplicateResponsePromise).status()).toBe(409);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('dialog').locator('button').first().click();

    await categoryEdit(page, sharedCategoryId).click({ force: true });
    await page.getByTestId('board-category-name').fill('P9V Shared UI Updated');
    const updateResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'PATCH'
        && response.url().includes('/categories/' + sharedCategoryId)
    ));
    await page.getByTestId('board-category-submit').click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.status()).toBe(200);
    expect(updateResponse.headers().etag).toBe('"2"');

    const openRow = row(page, harness.fixture.tickets.openA);
    await openRow.getByTestId('board-item-category').click();
    const assignResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'PATCH'
        && response.url().includes('/items/' + harness.fixture.tickets.openA + '/state')
    ));
    await page.locator('[data-testid="board-item-category-option"][data-category-id="' + sharedCategoryId + '"]').click();
    expect((await assignResponsePromise).status()).toBe(200);
    await expect(openRow).toContainText('P9V Shared UI Updated');

    await categoryEdit(page, sharedCategoryId).click({ force: true });
    page.once('dialog', (dialog) => dialog.accept());
    const archiveResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().includes('/categories/' + sharedCategoryId + '/archive')
    ));
    await page.getByTestId('board-category-archive').click();
    expect((await archiveResponsePromise).status()).toBe(200);
    await expect(openRow).toContainText('P9V Shared UI Updated');

    const unassignedRow = row(page, harness.fixture.tickets.bulkA1);
    await unassignedRow.getByTestId('board-item-category').click();
    await expect(page.locator('[data-testid="board-item-category-option"][data-category-id="' + sharedCategoryId + '"]')).toHaveCount(0);
    await unassignedRow.getByTestId('board-item-category').click();

    await openRow.getByTestId('board-item-category').click();
    const removeResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'PATCH'
        && response.url().includes('/items/' + harness.fixture.tickets.openA + '/state')
    ));
    await page.getByTestId('board-item-category-remove').click();
    expect((await removeResponsePromise).status()).toBe(200);
    const state = await harness.api('A1', harness.boardPath('a', 'OPEN') + '/items/' + harness.fixture.tickets.openA + '/state');
    expect(state.body.data.category).toBeNull();
});

test('P9V-E2E-003 real Board-state and category version conflicts recover without overwriting current server state', async () => {
    const categoryCreated = await harness.api('A1', harness.boardPath('a', 'OPEN') + '/categories', {
        method: 'POST',
        body: { name: 'P9V Conflict Category', description: null, color: '#2563EB' }
    });
    expect(categoryCreated.response.status).toBe(201);
    const categoryId = categoryCreated.body.data.id;
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });

    await page.getByTestId('board-category-menu').click();
    await categoryEdit(page, categoryId).click({ force: true });
    await page.getByTestId('board-category-name').fill('P9V Browser Stale Name');
    const categoryUrlPart = '/categories/' + categoryId;
    let categoryIntercepted = false;
    await page.route('**' + categoryUrlPart, async (route) => {
        if (route.request().method() !== 'PATCH' || categoryIntercepted) return route.continue();
        categoryIntercepted = true;
        const external = await harness.api('A2', harness.boardPath('a', 'OPEN') + categoryUrlPart, {
            method: 'PATCH',
            headers: { 'If-Match': '"1"' },
            body: { name: 'P9V Server Current Name' }
        });
        expect(external.response.status).toBe(200);
        await route.continue();
    });
    const staleCategoryResponse = page.waitForResponse((response) => (
        response.request().method() === 'PATCH' && response.url().includes(categoryUrlPart)
    ));
    await page.getByTestId('board-category-submit').click();
    expect((await staleCategoryResponse).status()).toBe(409);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('dialog').locator('button').first().click();
    await page.unroute('**' + categoryUrlPart);

    const conflictTicket = harness.fixture.tickets.conflictA;
    const stateUrlPart = '/items/' + conflictTicket + '/state';
    let stateIntercepted = false;
    await page.route('**' + stateUrlPart, async (route) => {
        if (route.request().method() !== 'PATCH' || stateIntercepted) return route.continue();
        stateIntercepted = true;
        const external = await harness.api('A2', harness.boardPath('a', 'OPEN') + stateUrlPart, {
            method: 'PATCH',
            headers: { 'If-Match': '"0"' },
            body: { categoryId }
        });
        expect(external.response.status).toBe(200);
        await route.continue();
    });
    const staleStateResponse = page.waitForResponse((response) => (
        response.request().method() === 'PATCH' && response.url().includes(stateUrlPart)
    ));
    await row(page, conflictTicket).getByTestId('board-item-pin').click();
    expect((await staleStateResponse).status()).toBe(409);
    await expect(page.getByTestId('board-conflict-retry')).toBeVisible();
    const retryResponse = page.waitForResponse((response) => (
        response.request().method() === 'PATCH' && response.url().includes(stateUrlPart)
    ));
    await page.getByTestId('board-conflict-retry').click();
    const retryResult = await retryResponse;
    const retryBody = await retryResult.text();
    expect(retryResult.status(), retryBody).toBe(200);
    await page.unroute('**' + stateUrlPart);
});

test('P9V-E2E-004 OPEN, CLOSED, EXTERNAL_SENT and EXTERNAL_RECEIVED remain independent and transfers use Transfer IDs', async () => {
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    await expect(row(page, harness.fixture.tickets.openA)).toBeVisible();
    await expect(row(page, harness.fixture.tickets.closedA)).toHaveCount(0);

    await harness.setBoardContext(page, { room: 'a', view: 'history' });
    await expect(row(page, harness.fixture.tickets.closedA)).toBeVisible();
    await expect(row(page, harness.fixture.tickets.openA)).toHaveCount(0);
    const closedState = await harness.api('A1', harness.boardPath('a', 'CLOSED') + '/items/' + harness.fixture.tickets.closedA + '/state');
    expect(closedState.body.data.version).toBe(0);

    await harness.setBoardContext(page, { room: 'a', view: 'external' });
    const sentAResponse = page.waitForResponse((response) => response.url().includes('/boards/EXTERNAL_SENT/items'));
    await page.getByTestId('external-board-sent').click();
    expect((await sentAResponse).status()).toBe(200);
    await expect(row(page, harness.fixture.transfers.ab)).toBeVisible();
    expect(await row(page, harness.fixture.transfers.ab).getAttribute('data-board-type')).toBe('EXTERNAL_SENT');

    const bClient = await harness.newPage({ actor: 'B1', room: 'b', view: 'external' });
    await expect(row(bClient.page, harness.fixture.transfers.ab)).toBeVisible();
    const sentBResponse = bClient.page.waitForResponse((response) => response.url().includes('/boards/EXTERNAL_SENT/items'));
    await bClient.page.getByTestId('external-board-sent').click();
    expect((await sentBResponse).status()).toBe(200);
    await expect(row(bClient.page, harness.fixture.transfers.bc)).toBeVisible();
    await expect(row(bClient.page, harness.fixture.transfers.ab)).toHaveCount(0);

    const cClient = await harness.newPage({ actor: 'C1', room: 'c', view: 'external' });
    await expect(row(cClient.page, harness.fixture.transfers.bc)).toBeVisible();
    expect(await row(cClient.page, harness.fixture.transfers.bc).getAttribute('data-board-type')).toBe('EXTERNAL_RECEIVED');
    expect(harness.fixture.transfers.ab).not.toBe(harness.fixture.transfers.bc);
});

test('P9V-E2E-005 room-switch and board-switch races cannot commit stale items or stale categories', async () => {
    const categoryA = await harness.api('A1', harness.boardPath('a', 'OPEN') + '/categories', {
        method: 'POST',
        body: { name: 'P9V Race Room A', description: null, color: '#3B82F6' }
    });
    const categoryB = await harness.api('B1', harness.boardPath('b', 'OPEN') + '/categories', {
        method: 'POST',
        body: { name: 'P9V Race Room B', description: null, color: '#14B8A6' }
    });
    expect(categoryA.response.status).toBe(201);
    expect(categoryB.response.status).toBe(201);

    const { page } = await harness.newPage({ actor: 'SYSTEM_ADMIN', room: 'b', view: 'open_complaints' });
    const roomAId = harness.fixture.rooms.a.id;
    await page.route('**/rooms/' + roomAId + '/boards/OPEN/**', async (route) => {
        await sleep(650);
        await route.continue();
    });
    await harness.setBoardContext(page, { room: 'a', view: 'open_complaints', waitForBoard: false });
    await sleep(80);
    await harness.setBoardContext(page, { room: 'b', view: 'open_complaints' });
    await expect(row(page, harness.fixture.tickets.openB)).toBeVisible();
    await sleep(750);
    await expect(row(page, harness.fixture.tickets.openA)).toHaveCount(0);
    await page.getByTestId('board-category-menu').click();
    await expect(page.getByText('P9V Race Room B', { exact: true })).toBeVisible();
    await expect(page.getByText('P9V Race Room A', { exact: true })).toHaveCount(0);
    await page.getByTestId('board-category-menu').click();
    await page.unroute('**/rooms/' + roomAId + '/boards/OPEN/**');

    const roomBId = harness.fixture.rooms.b.id;
    await page.route('**/rooms/' + roomBId + '/boards/EXTERNAL_RECEIVED/**', async (route) => {
        await sleep(650);
        await route.continue();
    });
    await harness.setBoardContext(page, { room: 'b', view: 'external', waitForBoard: false });
    await sleep(80);
    const sentResponse = page.waitForResponse((response) => response.url().includes('/boards/EXTERNAL_SENT/items'));
    await page.getByTestId('external-board-sent').click();
    expect((await sentResponse).status()).toBe(200);
    await expect(row(page, harness.fixture.transfers.bc)).toBeVisible();
    await sleep(750);
    await expect(row(page, harness.fixture.transfers.ab)).toHaveCount(0);
    await page.unroute('**/rooms/' + roomBId + '/boards/EXTERNAL_RECEIVED/**');
});

test('P9V-E2E-006 two authenticated clients synchronize through Socket.IO, reconnect and coalesce invalidations', async () => {
    const first = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const second = await harness.newPage({ actor: 'A2', room: 'a', view: 'open_complaints' });
    const page1 = first.page;
    const page2 = second.page;
    const targetId = harness.fixture.tickets.openA;
    const pin1 = row(page1, targetId).getByTestId('board-item-pin');
    const pin2 = row(page2, targetId).getByTestId('board-item-pin');

    const currentState = await harness.api('A1', harness.boardPath('a', 'OPEN') + '/items/' + targetId + '/state');
    if (currentState.body.data.isPinned) {
        const response = page1.waitForResponse((item) => item.request().method() === 'PATCH' && item.url().includes('/items/' + targetId + '/state'));
        await pin1.click();
        await response;
        await expect(pin2).toHaveAttribute('aria-pressed', 'false');
    }
    const page1Mutation = page1.waitForResponse((item) => item.request().method() === 'PATCH' && item.url().includes('/items/' + targetId + '/state'));
    await pin1.click();
    expect((await page1Mutation).status()).toBe(200);
    await expect(pin2).toHaveAttribute('aria-pressed', 'true');

    let refreshCount = 0;
    page2.on('response', (response) => {
        if (response.request().method() === 'GET' && response.url().includes('/boards/OPEN/items')) refreshCount += 1;
    });
    const statePath = harness.boardPath('a', 'OPEN') + '/items/' + targetId + '/state';
    const latest = await harness.api('A1', statePath);
    const firstUpdate = await harness.api('A1', statePath, {
        method: 'PATCH',
        headers: { 'If-Match': latest.response.headers.get('etag') },
        body: { isPinned: false }
    });
    const secondUpdate = await harness.api('A1', statePath, {
        method: 'PATCH',
        headers: { 'If-Match': firstUpdate.response.headers.get('etag') },
        body: { isPinned: true }
    });
    expect(firstUpdate.response.status).toBe(200);
    expect(secondUpdate.response.status).toBe(200);
    await expect.poll(() => refreshCount, { timeout: 5000 }).toBe(1);
    await sleep(400);
    expect(refreshCount).toBe(1);

    await second.context.setOffline(true);
    await sleep(250);
    const reconnectRefresh = page2.waitForResponse((response) => (
        response.request().method() === 'GET' && response.url().includes('/boards/OPEN/items')
    ));
    await second.context.setOffline(false);
    expect((await reconnectRefresh).status()).toBe(200);
});

test('P9V-E2E-007 bulk category mutation reports honest partial success after one item becomes ineligible', async () => {
    const created = await harness.api('A1', harness.boardPath('a', 'OPEN') + '/categories', {
        method: 'POST',
        body: { name: 'P9V Bulk Category', description: null, color: '#8B5CF6' }
    });
    expect(created.response.status).toBe(201);
    const categoryId = created.body.data.id;
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    await page.getByTestId('board-bulk-toggle').click();
    await row(page, harness.fixture.tickets.bulkA1).locator('label').first().click();
    await row(page, harness.fixture.tickets.bulkA2).locator('label').first().click();

    const failingId = harness.fixture.tickets.bulkA2;
    let madeIneligible = false;
    await page.route('**/items/' + failingId + '/state', async (route) => {
        if (route.request().method() !== 'PATCH' || madeIneligible) return route.continue();
        madeIneligible = true;
        const closed = await harness.api('A1', '/api/tickets/' + failingId + '/close', {
            method: 'POST',
            headers: { 'If-Match': '"1"' },
            body: { closureSummary: 'P9V makes one bulk item ineligible' }
        });
        expect(closed.response.status).toBe(200);
        await route.continue();
    });

    const outcomes = [];
    const listener = (response) => {
        if (response.request().method() === 'PATCH' && response.url().includes('/items/') && response.url().includes('/state')) {
            outcomes.push(response.status());
        }
    };
    page.on('response', listener);
    await page.getByTestId('board-bulk-category').selectOption(categoryId);
    await expect.poll(() => outcomes.length).toBe(2);
    page.off('response', listener);
    expect(outcomes.filter((status) => status === 200)).toHaveLength(1);
    expect(outcomes.filter((status) => status !== 200)).toHaveLength(1);

    const successState = await harness.api('A1', harness.boardPath('a', 'OPEN') + '/items/' + harness.fixture.tickets.bulkA1 + '/state');
    expect(successState.response.status).toBe(200);
    expect(successState.body.data.category.id).toBe(categoryId);
    const failedState = await harness.api('A1', harness.boardPath('a', 'OPEN') + '/items/' + failingId + '/state');
    expect(failedState.response.status).toBe(404);
    await page.unroute('**/items/' + failingId + '/state');
});
test('RTI-E2E-008 hierarchy selection supplies the canonical Room ObjectId without injecting Room state', async () => {
    const { page } = await openBarePage();
    await waitForSessionStatus(page, 'authenticated');
    const environmentOption = page.locator(
        '[data-testid="organization-environment-option"][data-environment-id="' + harness.fixture.environment + '"]'
    );
    await expect(environmentOption).toBeVisible();
    await environmentOption.click();
    await page.getByTestId('organization-environment-confirm').click();

    const subEnvironmentCard = page.locator(
        '[data-testid="organization-entity-card"][data-entity-level="sub_envs"][data-entity-id="' + harness.fixture.subEnvironment + '"]'
    );
    await expect(subEnvironmentCard).toBeVisible();
    await subEnvironmentCard.getByTestId('organization-entity-open').click();
    const roomCard = page.locator(
        '[data-testid="organization-entity-card"][data-entity-level="rooms"][data-entity-id="' + harness.fixture.rooms.a.id + '"]'
    );
    await expect(roomCard).toBeVisible();
    await roomCard.getByTestId('organization-entity-open').click();
    await expect.poll(() => page.evaluate(async () => {
        const module = await import('/src/store/session.store.js');
        return module.useSessionStore.getState().selectedRoom?.id || '';
    })).toBe(harness.fixture.rooms.a.id);

    const boardResponse = page.waitForResponse((response) => (
        response.request().method() === 'GET'
        && response.url().includes('/api/rooms/' + harness.fixture.rooms.a.id + '/boards/OPEN/items')
    ));
    await page.evaluate(async () => {
        const module = await import('/src/store/session.store.js');
        module.useSessionStore.getState().navigate('open_complaints');
    });
    expect((await boardResponse).status()).toBe(200);
    await expect(row(page, harness.fixture.tickets.openA)).toBeVisible();
});

test('RTI-E2E-009 a missing Room keeps the user in hierarchy and never starts a Board request', async () => {
    const { page } = await openBarePage();
    await waitForSessionStatus(page, 'authenticated');
    await expect(page.locator('[data-testid="organization-environment-option"]').first()).toBeVisible();
    const boardRequests = await page.evaluate(() => performance.getEntriesByType('resource')
        .filter((entry) => entry.name.includes('/api/rooms/') && entry.name.includes('/boards/'))
        .length);
    expect(boardRequests).toBe(0);
});
test('RTI-E2E-010 missing SSO is one authentication error, not a Room-selection or empty state', async () => {
    const { page } = await openBarePage({ authenticated: false });
    await waitForSessionStatus(page, 'unavailable');
    let boardRequests = 0;
    page.on('request', (request) => {
        if (request.url().includes('/api/rooms/') && request.url().includes('/boards/')) boardRequests += 1;
    });
    await page.evaluate(async () => {
        const module = await import('/src/store/session.store.js');
        module.useSessionStore.setState({ currentView: 'open_complaints', showEnvModal: false });
    });
    const authGate = page.getByRole('heading', { name: 'לא ניתן לפתוח את תמר' });
    await expect(authGate).toBeVisible();
    await expect(page.locator('body')).toContainText('SSO');
    await expect(page.getByTestId('inquiry-runtime-state-auth_error')).toHaveCount(0);
    await expect(page.getByTestId('inquiry-runtime-state-context_error')).toHaveCount(0);
    await expect(page.getByTestId('inquiry-runtime-state-empty')).toHaveCount(0);
    await sleep(250);
    expect(boardRequests).toBe(0);
});

test('RTI-E2E-011 initial Board API failure is exclusive and retry issues exactly one current-Room request', async () => {
    const { page } = await openBarePage();
    await waitForSessionStatus(page, 'authenticated');
    const itemsPattern = '**/api/rooms/' + harness.fixture.rooms.a.id + '/boards/OPEN/items*';
    let itemRequests = 0;
    await page.route(itemsPattern, async (route) => {
        itemRequests += 1;
        if (itemRequests === 1) {
            await route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    error: { code: 'RTI_FORCED_FAILURE', message: 'כשל זמני מבוקר', requestId: 'rti-e2e-011' }
                })
            });
            return;
        }
        await route.continue();
    });
    await setRuntimeView(page);
    const apiError = page.getByTestId('inquiry-runtime-state-api_error');
    await expect(apiError).toBeVisible();
    await expect(apiError).toContainText('שירות הלוחות אינו זמין כרגע');
    await expect(apiError).toContainText('rti-e2e-011');
    await expect(page.getByTestId('inquiry-runtime-state-empty')).toHaveCount(0);
    await page.getByTestId('inquiry-runtime-action').click();
    await expect(row(page, harness.fixture.tickets.openA)).toBeVisible();
    expect(itemRequests).toBe(2);
    await page.unroute(itemsPattern);
});

test('RTI-E2E-012 successful global empty and filtered empty states are distinct', async () => {
    const { page } = await openBarePage();
    await waitForSessionStatus(page, 'authenticated');
    const itemsPattern = '**/api/rooms/' + harness.fixture.rooms.a.id + '/boards/OPEN/items*';
    await page.route(itemsPattern, (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            success: true,
            data: {
                items: [],
                pagination: {
                    page: 1,
                    limit: 7,
                    totalItems: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false
                },
                capabilities: { canChangeCategory: true, canChangePin: true }
            }
        })
    }));
    await setRuntimeView(page);
    await expect(page.getByTestId('inquiry-runtime-state-empty')).toBeVisible();
    await page.getByPlaceholder('חיפוש לפי מספר פנייה, נושא או תיאור...').fill('אין התאמה');
    await expect(page.getByTestId('inquiry-runtime-state-filtered_empty')).toBeVisible();
    await expect(page.getByTestId('inquiry-runtime-state-empty')).toHaveCount(0);
    await page.unroute(itemsPattern);
});
test('RTI-E2E-013 major routes render without console errors, Mojibake or viewport overflow', async () => {
    const { page } = await openBarePage();
    const consoleErrors = [];
    const pageErrors = [];
    const forbiddenResponses = [];
    page.on('response', (response) => {
        if (response.status() === 403) forbiddenResponses.push(`${response.request().method()} ${response.url()}`);
    });
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await waitForSessionStatus(page, 'authenticated');

    const auditSurface = async (name) => {
        await page.waitForTimeout(250);
        const result = await page.evaluate(() => ({
            text: document.body.innerText,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            direction: getComputedStyle(document.body).direction
        }));
        expect(result.text.length, name + ' rendered no content').toBeGreaterThan(20);
        expect(/[�ÃÂ]|â€/.test(result.text), name + ' contains Mojibake').toBe(false);
        expect(result.documentWidth, name + ' has horizontal viewport overflow').toBeLessThanOrEqual(result.viewportWidth + 2);
        expect(result.direction, name + ' lost RTL').toBe('rtl');
    };
    const navigate = (view) => page.evaluate(async (currentView) => {
        const module = await import('/src/store/session.store.js');
        module.useSessionStore.getState().navigate(currentView);
    }, view);
    const navigateBoard = async (view, boardType) => {
        const responsePromise = page.waitForResponse((response) => (
            response.request().method() === 'GET'
            && response.url().includes('/api/rooms/' + harness.fixture.rooms.a.id + '/boards/' + boardType + '/items')
        ));
        await navigate(view);
        expect((await responsePromise).status()).toBe(200);
        await auditSurface(view + ':' + boardType);
    };

    await setRuntimeView(page, { view: 'dashboard' });
    await auditSurface('dashboard');
    for (const view of ['new_complaint', 'my_tasks', 'settings', 'user_management', 'hierarchy']) {
        await navigate(view);
        await auditSurface(view);
    }
    await navigateBoard('open_complaints', 'OPEN');
    await page.getByRole('button', { name: /צפה בפנייה/u }).first().click();
    await expect(page.getByText('מידע קריטי', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await navigateBoard('history', 'CLOSED');
    await navigateBoard('external', 'EXTERNAL_RECEIVED');
    const sentResponse = page.waitForResponse((response) => (
        response.request().method() === 'GET'
        && response.url().includes('/api/rooms/' + harness.fixture.rooms.a.id + '/boards/EXTERNAL_SENT/items')
    ));
    await page.getByTestId('external-board-sent').click();
    expect((await sentResponse).status()).toBe(200);
    await auditSurface('external:EXTERNAL_SENT');
    await navigate('super_admin');
    await expect(page.getByText('אין הרשאה למרכז השליטה', { exact: true })).toBeVisible();
    await auditSurface('super_admin:forbidden');
    await page.evaluate(async () => {
        const module = await import('/src/store/session.store.js');
        module.useSessionStore.setState({ currentView: 'missing_route', showEnvModal: false });
    });
    await expect(page.getByText('אין תצוגה זמינה', { exact: true })).toBeVisible();
    await auditSurface('fallback');

    expect(pageErrors).toEqual([]);
    expect(forbiddenResponses).toEqual([]);
    expect(consoleErrors).toEqual([]);
});
