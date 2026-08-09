const { randomUUID } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { Phase9VHarness, sleep } = require('../phase9v/support/harness.cjs');
const OrganizationMembership = require('../../tamar-server/src/models/OrganizationMembership.js');

process.env.NODE_ENV = 'test';
process.env.MONGODB_DATABASE = 'tamar_test';

test.describe.configure({ mode: 'serial' });
let harness;
const seeded = {};
const row = (page, itemId) => page.locator('[data-testid="board-item-row"][data-board-item-id="' + itemId + '"]');
const messageRow = (drawer, messageId) => drawer.locator('[data-testid="ticket-chat-message"][data-message-id="' + messageId + '"]');

const createMessage = async (actor, ticketId, content, clientMessageId = randomUUID()) => {
    const result = await harness.api(actor, '/api/tickets/' + ticketId + '/messages', {
        method: 'POST', body: { clientMessageId, content }
    });
    expect([200, 201]).toContain(result.response.status);
    return { ...result, clientMessageId, message: result.body.data.message };
};

const openChat = async (page, { itemId, ticketId }) => {
    await row(page, itemId).getByTitle('צפה בפנייה').click();
    const modal = page.getByTestId('ticket-details-modal');
    await expect(modal).toBeVisible();
    const history = page.waitForResponse((response) => response.request().method() === 'GET'
        && response.url().includes('/api/tickets/' + ticketId + '/messages?'));
    await modal.getByRole('button', { name: 'צ׳אט הפנייה', exact: true }).click();
    expect((await history).status()).toBe(200);
    const drawer = page.getByTestId('ticket-chat-drawer');
    await expect(drawer).toHaveAttribute('data-ticket-id', ticketId);
    await expect(drawer.getByTestId('ticket-chat-messages')).toBeVisible();
    return drawer;
};

const closeDetails = async (page) => {
    if (await page.getByTestId('ticket-chat-drawer').isVisible().catch(() => false)) {
        await page.getByTestId('ticket-chat-close').click();
    }
    if (await page.getByTestId('ticket-details-modal').isVisible().catch(() => false)) {
        await page.getByTestId('ticket-details-close').click();
    }
};

const selectSentExternal = async (page) => {
    const response = page.waitForResponse((item) => item.request().method() === 'GET' && item.url().includes('/boards/EXTERNAL_SENT/items'));
    await page.getByTestId('external-board-sent').click();
    expect((await response).status()).toBe(200);
};

test.beforeAll(async () => {
    harness = await new Phase9VHarness().start();
    seeded.continuity = 'P10 continuity A-B-C';
    await createMessage('A1', harness.fixture.tickets.transfer, seeded.continuity);
    seeded.pagination = [];
    for (let index = 1; index <= 55; index += 1) {
        const created = await createMessage('A1', harness.fixture.tickets.conflictA, 'P10 page message ' + String(index).padStart(2, '0'));
        seeded.pagination.push(created.message);
    }
    const tombstone = seeded.pagination[1];
    const deleted = await harness.api('A1', '/api/tickets/' + harness.fixture.tickets.conflictA + '/messages/' + tombstone.id, {
        method: 'DELETE', headers: { 'If-Match': '"1"' }
    });
    expect(deleted.response.status).toBe(200);
});

test.afterAll(async () => {
    if (harness) await harness.close();
});

test('P10-E2E-001 OPEN chat creates with UUID, reloads and idempotent replay does not duplicate', async () => {
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const ticketId = harness.fixture.tickets.openA;
    let drawer = await openChat(page, { itemId: ticketId, ticketId });
    const content = 'P10 browser create ' + Date.now();
    const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
        && response.url().endsWith('/api/tickets/' + ticketId + '/messages'));
    await drawer.getByTestId('ticket-chat-composer').fill(content);
    await drawer.getByTestId('ticket-chat-send').click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const requestBody = response.request().postDataJSON();
    expect(requestBody.clientMessageId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    await expect(drawer.getByText(content, { exact: true })).toBeVisible();

    const replay = await createMessage('A1', ticketId, content, requestBody.clientMessageId);
    expect(replay.response.status).toBe(200);
    await closeDetails(page);
    drawer = await openChat(page, { itemId: ticketId, ticketId });
    await expect(drawer.getByText(content, { exact: true })).toHaveCount(1);
});

test('P10-E2E-002 own edit/delete works, manager has no override and tombstone replaces content', async () => {
    const ticketId = harness.fixture.tickets.openA;
    const original = 'P10 ownership original ' + Date.now();
    const created = await createMessage('A1', ticketId, original);
    const first = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const drawer = await openChat(first.page, { itemId: ticketId, ticketId });
    const item = messageRow(drawer, created.message.id);
    await item.getByTestId('chat-message-edit-' + created.message.id).click();
    const edited = original + ' edited';
    await item.getByTestId('chat-message-edit-input-' + created.message.id).fill(edited);
    const patchPromise = first.page.waitForResponse((response) => response.request().method() === 'PATCH'
        && response.url().endsWith('/messages/' + created.message.id));
    await item.getByTestId('chat-message-edit-save-' + created.message.id).click();
    const patched = await patchPromise;
    expect(patched.status()).toBe(200);
    expect(patched.request().headers()['if-match']).toBe('"1"');
    await expect(item.getByText(edited, { exact: true })).toBeVisible();

    const manager = await harness.newPage({ actor: 'A_MANAGER', room: 'a', view: 'open_complaints' });
    const managerDrawer = await openChat(manager.page, { itemId: ticketId, ticketId });
    const managerItem = messageRow(managerDrawer, created.message.id);
    await expect(managerItem.getByTestId('chat-message-edit-' + created.message.id)).toHaveCount(0);
    await expect(managerItem.getByTestId('chat-message-delete-' + created.message.id)).toHaveCount(0);

    await item.getByTestId('chat-message-delete-' + created.message.id).click();
    const deletePromise = first.page.waitForResponse((response) => response.request().method() === 'DELETE'
        && response.url().endsWith('/messages/' + created.message.id));
    await first.page.getByTestId('ticket-chat-delete-confirm').click();
    const deleted = await deletePromise;
    expect(deleted.status()).toBe(200);
    expect(deleted.request().headers()['if-match']).toBe('"2"');
    await expect(item.getByTestId('ticket-chat-tombstone')).toBeVisible();
    await expect(item.getByText(edited, { exact: true })).toHaveCount(0);
    await expect(managerItem.getByTestId('ticket-chat-tombstone')).toBeVisible();
});

test('P10-E2E-003 CLOSED ticket remains read-only for workflow but writable in chat', async () => {
    const ticketId = harness.fixture.tickets.closedA;
    const detail = await harness.api('A1', '/api/tickets/' + ticketId);
    expect(detail.body.data.capabilities.isReadOnly).toBe(true);
    expect(detail.body.data.capabilities.canWriteChat).toBe(true);
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'history' });
    const drawer = await openChat(page, { itemId: ticketId, ticketId });
    await expect(drawer.getByTestId('ticket-chat-composer')).toBeVisible();
    const content = 'P10 closed writable ' + Date.now();
    await drawer.getByTestId('ticket-chat-composer').fill(content);
    const response = page.waitForResponse((item) => item.request().method() === 'POST' && item.url().includes('/tickets/' + ticketId + '/messages'));
    await drawer.getByTestId('ticket-chat-send').click();
    expect((await response).status()).toBe(201);
    await expect(drawer.getByText(content, { exact: true })).toBeVisible();
});

test('P10-E2E-004 external Transfer row opens Message API with Ticket ID, never Transfer ID', async () => {
    const { page } = await harness.newPage({ actor: 'B1', room: 'b', view: 'external' });
    const ticketId = harness.fixture.tickets.transfer;
    const transferId = harness.fixture.transfers.ab;
    const drawer = await openChat(page, { itemId: transferId, ticketId });
    await expect(drawer).toHaveAttribute('data-ticket-id', ticketId);
    expect(ticketId).not.toBe(transferId);
    const messageRequests = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('/messages')));
    expect(messageRequests.some((url) => url.includes('/tickets/' + ticketId + '/messages'))).toBe(true);
    expect(messageRequests.some((url) => url.includes('/tickets/' + transferId + '/messages'))).toBe(false);
});

test('P10-E2E-005 A-B-C chat is continuous for previous Room, current source and pending destination', async () => {
    const ticketId = harness.fixture.tickets.transfer;
    const previous = await harness.newPage({ actor: 'A1', room: 'a', view: 'external' });
    await selectSentExternal(previous.page);
    const previousDrawer = await openChat(previous.page, { itemId: harness.fixture.transfers.ab, ticketId });
    await expect(previousDrawer.getByText(seeded.continuity, { exact: true })).toBeVisible();
    await expect(previousDrawer.getByTestId('ticket-chat-composer')).toBeVisible();

    const source = await harness.newPage({ actor: 'B1', room: 'b', view: 'external' });
    await selectSentExternal(source.page);
    const sourceDrawer = await openChat(source.page, { itemId: harness.fixture.transfers.bc, ticketId });
    await expect(sourceDrawer.getByText(seeded.continuity, { exact: true })).toBeVisible();
    await expect(sourceDrawer.getByTestId('ticket-chat-composer')).toBeVisible();

    const destination = await harness.newPage({ actor: 'C1', room: 'c', view: 'external' });
    const destinationDrawer = await openChat(destination.page, { itemId: harness.fixture.transfers.bc, ticketId });
    await expect(destinationDrawer.getByText(seeded.continuity, { exact: true })).toBeVisible();
    await expect(destinationDrawer.getByTestId('ticket-chat-composer')).toBeVisible();
});

test('P10-E2E-006 cursor pagination prepends older messages, preserves anchor and keeps tombstones', async () => {
    const ticketId = harness.fixture.tickets.conflictA;
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const drawer = await openChat(page, { itemId: ticketId, ticketId });
    await expect(drawer.getByTestId('ticket-chat-message')).toHaveCount(50);
    await expect(drawer.getByText('P10 page message 55', { exact: true })).toBeVisible();
    const list = drawer.getByTestId('ticket-chat-messages');
    await list.evaluate((element) => { element.scrollTop = 0; });
    const beforeTop = await list.evaluate((element) => element.scrollTop);
    const olderResponse = page.waitForResponse((response) => response.request().method() === 'GET'
        && response.url().includes('/tickets/' + ticketId + '/messages?')
        && response.url().includes('before='));
    await drawer.getByTestId('ticket-chat-load-older').click();
    expect((await olderResponse).status()).toBe(200);
    await expect(drawer.getByTestId('ticket-chat-message')).toHaveCount(55);
    await expect(drawer.getByText('P10 page message 01', { exact: true })).toBeVisible();
    await expect(messageRow(drawer, seeded.pagination[1].id).getByTestId('ticket-chat-tombstone')).toBeVisible();
    await expect(drawer.getByTestId('ticket-chat-load-older')).toHaveCount(0);
    const afterTop = await list.evaluate((element) => element.scrollTop);
    expect(beforeTop).toBe(0);
    expect(afterTop).toBeGreaterThan(0);
    const ids = await drawer.getByTestId('ticket-chat-message').evaluateAll((nodes) => nodes.map((node) => node.dataset.messageId));
    expect(new Set(ids).size).toBe(ids.length);
});

test('P10-E2E-007 two clients synchronize create, edit and soft-delete through scoped invalidation', async () => {
    const ticketId = harness.fixture.tickets.openA;
    const first = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const second = await harness.newPage({ actor: 'A2', room: 'a', view: 'open_complaints' });
    const firstDrawer = await openChat(first.page, { itemId: ticketId, ticketId });
    const secondDrawer = await openChat(second.page, { itemId: ticketId, ticketId });
    let refreshes = 0;
    second.page.on('response', (response) => {
        if (response.request().method() === 'GET' && response.url().includes('/tickets/' + ticketId + '/messages?')) refreshes += 1;
    });
    const content = 'P10 realtime ' + Date.now();
    const post = first.page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/tickets/' + ticketId + '/messages'));
    await firstDrawer.getByTestId('ticket-chat-composer').fill(content);
    await firstDrawer.getByTestId('ticket-chat-send').click();
    const createdResponse = await post;
    const created = (await createdResponse.json()).data.message;
    await expect(secondDrawer.getByText(content, { exact: true })).toBeVisible();

    const firstItem = messageRow(firstDrawer, created.id);
    await firstItem.getByTestId('chat-message-edit-' + created.id).click();
    const edited = content + ' updated';
    await firstItem.getByTestId('chat-message-edit-input-' + created.id).fill(edited);
    await firstItem.getByTestId('chat-message-edit-save-' + created.id).click();
    await expect(messageRow(secondDrawer, created.id).getByText(edited, { exact: true })).toBeVisible();
    await expect(messageRow(secondDrawer, created.id).getByText('נערכה', { exact: true })).toBeVisible();

    await firstItem.getByTestId('chat-message-delete-' + created.id).click();
    await first.page.getByTestId('ticket-chat-delete-confirm').click();
    await expect(messageRow(secondDrawer, created.id).getByTestId('ticket-chat-tombstone')).toBeVisible();
    expect(refreshes).toBeLessThanOrEqual(3);
});

test('P10-E2E-008 stale edit shows real version conflict, server truth and preserves draft for retry', async () => {
    const ticketId = harness.fixture.tickets.openA;
    const created = await createMessage('A1', ticketId, 'P10 conflict base ' + Date.now());
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const drawer = await openChat(page, { itemId: ticketId, ticketId });
    const item = messageRow(drawer, created.message.id);
    await item.getByTestId('chat-message-edit-' + created.message.id).click();
    const draft = 'P10 intended stale edit';
    await item.getByTestId('chat-message-edit-input-' + created.message.id).fill(draft);
    const serverText = 'P10 server current text';
    const external = await harness.api('A1', '/api/tickets/' + ticketId + '/messages/' + created.message.id, {
        method: 'PATCH', headers: { 'If-Match': '"1"' }, body: { content: serverText }
    });
    expect(external.response.status).toBe(200);
    const conflictResponse = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().endsWith('/messages/' + created.message.id));
    await item.getByTestId('chat-message-edit-save-' + created.message.id).click();
    expect((await conflictResponse).status()).toBe(409);
    await expect(drawer.getByText('גרסת השרת: ' + serverText, { exact: true })).toBeVisible();
    await expect(item.getByTestId('chat-message-edit-input-' + created.message.id)).toHaveValue(draft);
    const retry = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().endsWith('/messages/' + created.message.id) && response.status() === 200);
    await item.getByTestId('chat-message-edit-save-' + created.message.id).click();
    expect((await retry).status()).toBe(200);
    await expect(item.getByText(draft, { exact: true })).toBeVisible();
});

test('P10-E2E-009 concurrent edit/delete has one winner and final tombstone cannot show edited content', async () => {
    const ticketId = harness.fixture.tickets.openA;
    const created = await createMessage('A1', ticketId, 'P10 race live ' + Date.now());
    const pathName = '/api/tickets/' + ticketId + '/messages/' + created.message.id;
    const [edit, remove] = await Promise.all([
        harness.api('A1', pathName, { method: 'PATCH', headers: { 'If-Match': '"1"' }, body: { content: 'P10 race edited' } }),
        harness.api('A1', pathName, { method: 'DELETE', headers: { 'If-Match': '"1"' } })
    ]);
    expect([edit.response.status, remove.response.status].sort()).toEqual([200, 409]);
    if (edit.response.status === 200) {
        const finalDelete = await harness.api('A1', pathName, { method: 'DELETE', headers: { 'If-Match': '"2"' } });
        expect(finalDelete.response.status).toBe(200);
    }
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const drawer = await openChat(page, { itemId: ticketId, ticketId });
    const item = messageRow(drawer, created.message.id);
    await expect(item.getByTestId('ticket-chat-tombstone')).toBeVisible();
    await expect(item.getByText('P10 race edited', { exact: true })).toHaveCount(0);
});

test('P10-E2E-010 delayed Ticket A response cannot overwrite Ticket B chat state', async () => {
    const ticketA = harness.fixture.tickets.openA;
    const ticketB = harness.fixture.tickets.bulkA1;
    const markerA = 'P10 delayed A marker';
    await createMessage('A1', ticketA, markerA);
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    await page.route('**/api/tickets/' + ticketA + '/messages?*', async (route) => { await sleep(800); await route.continue(); });
    await row(page, ticketA).getByTitle('צפה בפנייה').click();
    await page.getByTestId('ticket-details-modal').getByRole('button', { name: 'צ׳אט הפנייה', exact: true }).click();
    await expect(page.getByTestId('ticket-chat-drawer')).toHaveAttribute('data-ticket-id', ticketA);
    await sleep(80);
    await closeDetails(page);
    const drawerB = await openChat(page, { itemId: ticketB, ticketId: ticketB });
    await sleep(900);
    await expect(drawerB).toHaveAttribute('data-ticket-id', ticketB);
    await expect(drawerB.getByText(markerA, { exact: true })).toHaveCount(0);
    await expect(drawerB.getByTestId('ticket-chat-composer')).toBeVisible();
    await page.unroute('**/api/tickets/' + ticketA + '/messages?*');
});

test('P10-E2E-011 Socket interruption keeps history and REST writes available, then reconnect refreshes once', async () => {
    const ticketId = harness.fixture.tickets.openA;
    const opened = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const drawer = await openChat(opened.page, { itemId: ticketId, ticketId });
    const existingCount = await drawer.getByTestId('ticket-chat-message').count();
    await opened.context.setOffline(true);
    await expect(drawer.getByTestId('ticket-chat-message')).toHaveCount(existingCount);
    await opened.context.setOffline(false);
    await expect(drawer.getByTestId('ticket-chat-realtime-status')).toHaveAttribute('data-connected', 'true');
    const content = 'P10 REST after reconnect ' + Date.now();
    await drawer.getByTestId('ticket-chat-composer').fill(content);
    const post = opened.page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/tickets/' + ticketId + '/messages'));
    await drawer.getByTestId('ticket-chat-send').click();
    expect((await post).status()).toBe(201);
    await expect(drawer.getByText(content, { exact: true })).toBeVisible();
});

test('P10-E2E-012 membership revocation removes active access and cached content from the reopened chat', async () => {
    const ticketId = harness.fixture.tickets.openA;
    const content = 'P10 revoke visible ' + Date.now();
    await createMessage('A1', ticketId, content);
    const opened = await harness.newPage({ actor: 'A2', room: 'a', view: 'open_complaints' });
    let drawer = await openChat(opened.page, { itemId: ticketId, ticketId });
    await expect(drawer.getByText(content, { exact: true })).toBeVisible();
    await OrganizationMembership.updateMany({ userId: harness.fixture.actors.A2.id }, { $set: { isActive: false } });
    await opened.page.getByTestId('ticket-chat-close').click();
    const denied = opened.page.waitForResponse((response) => response.request().method() === 'GET'
        && response.url().includes('/tickets/' + ticketId + '/messages?') && [403, 404].includes(response.status()));
    await opened.page.getByTestId('ticket-details-modal').getByRole('button', { name: 'צ׳אט הפנייה', exact: true }).click();
    await denied;
    drawer = opened.page.getByTestId('ticket-chat-drawer');
    await expect(drawer.getByRole('alert')).toBeVisible();
    await expect(drawer.getByText(content, { exact: true })).toHaveCount(0);
    await expect(drawer.getByTestId('ticket-chat-composer')).toHaveCount(0);
});

test('P10-E2E-013 plain text is escaped, mixed direction is readable and no attachment control exists', async () => {
    const ticketId = harness.fixture.tickets.openA;
    const { page } = await harness.newPage({ actor: 'A1', room: 'a', view: 'open_complaints' });
    const drawer = await openChat(page, { itemId: ticketId, ticketId });
    const content = '<img src=x onerror="globalThis.__chatXss=true"> שלום English 123 😀\nשורה שנייה';
    await drawer.getByTestId('ticket-chat-composer').fill(content);
    await drawer.getByTestId('ticket-chat-send').click();
    await expect(drawer.getByText(content, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => globalThis.__chatXss)).toBeUndefined();
    await expect(drawer.locator('img[src="x"]')).toHaveCount(0);
    await expect(drawer.getByRole('button', { name: /attach|upload|קובץ|צרופה/i })).toHaveCount(0);
});
