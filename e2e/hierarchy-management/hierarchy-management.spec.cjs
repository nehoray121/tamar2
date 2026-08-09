const { test, expect } = require('@playwright/test');
const { randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND_PORT = 15174;
const FRONTEND_URL = 'http://127.0.0.1:' + FRONTEND_PORT;
const suffix = randomBytes(5).toString('hex');
const subEnvironmentName = 'E2E SubEnvironment ' + suffix;
const roomName = 'E2E Room ' + suffix;
const createdIds = { subEnvironmentId: null, roomId: null };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const expectBreadcrumbOrder = async (page, expectedNames) => {
    const breadcrumb = page.getByTestId('organization-breadcrumb');
    const segments = breadcrumb.locator('[data-breadcrumb-segment]');
    await expect(segments).toHaveCount(expectedNames.length);
    await expect.poll(() => segments.allTextContents()).toEqual(expectedNames);
    const layout = await breadcrumb.evaluate((element) => {
        const style = getComputedStyle(element);
        const centers = [...element.querySelectorAll('[data-breadcrumb-segment]')]
            .map((segment) => {
                const bounds = segment.getBoundingClientRect();
                return bounds.left + (bounds.width / 2);
            });
        return { direction: style.direction, flexDirection: style.flexDirection, centers };
    });
    expect(layout.direction).toBe('rtl');
    expect(layout.flexDirection).toBe('row');
    for (let index = 1; index < layout.centers.length; index += 1) {
        expect(layout.centers[index - 1]).toBeGreaterThan(layout.centers[index]);
    }
};

const waitForHttp = async (url, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try { const response = await fetch(url); if (response.ok) return; } catch {}
        await sleep(200);
    }
    throw new Error('Timed out waiting for ' + url);
};
const waitForOutput = async (started, marker, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (started.output.join('').includes(marker)) return;
        if (started.child.exitCode !== null) throw new Error('Process exited before ' + marker + ': ' + started.output.join('').slice(-1500));
        await sleep(100);
    }
    throw new Error('Timed out waiting for process output: ' + marker);
};
const start = (command, args, environment = {}) => {
    const output = [];
    const child = spawn(command, args, {
        cwd: ROOT,
        env: { ...process.env, ...environment },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });
    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));
    return { child, output };
};
const stopTree = async (child) => {
    if (!child) return;
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    else child.kill('SIGTERM');
    await Promise.race([once(child, 'exit').catch(() => {}), sleep(5000)]);
};
const cleanupOwnedRecords = async () => {
    const mongoose = require(path.join(ROOT, 'tamar-server/node_modules/mongoose'));
    const Room = require(path.join(ROOT, 'tamar-server/src/models/Room.js'));
    const SubEnvironment = require(path.join(ROOT, 'tamar-server/src/models/SubEnvironment.js'));
    await mongoose.connect('mongodb://127.0.0.1:27017/?replicaSet=rs0', { dbName: 'tamar_dev', serverSelectionTimeoutMS: 8000 });
    if (mongoose.connection.db?.databaseName !== 'tamar_dev') throw new Error('Refusing hierarchy E2E cleanup outside tamar_dev');
    await Room.deleteMany({
        ...(createdIds.roomId ? { _id: createdIds.roomId } : {}),
        name: roomName
    });
    await SubEnvironment.deleteMany({
        ...(createdIds.subEnvironmentId ? { _id: createdIds.subEnvironmentId } : {}),
        name: subEnvironmentName
    });
    await mongoose.disconnect();
};
const login = async (page) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="local-development-personal-number"]').fill('1234567');
    await page.getByRole('button', { name: 'כניסה', exact: true }).click();
    await page.waitForFunction(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return state.authStatus === 'authenticated' && state.hierarchyStatus === 'ready';
    });
    const environmentDialog = page.getByRole('dialog', { name: 'בחירת סביבה' });
    const environmentDialogVisible = await environmentDialog.waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    if (environmentDialogVisible) {
        const environmentOption = page.getByTestId('organization-environment-option').filter({ hasText: 'Environment E1' });
        await environmentOption.click();
        await expect(environmentDialog).toContainText('נבחרה: Environment E1');
        const confirmEnvironmentButton = page.getByTestId('organization-environment-confirm');
        await expect(confirmEnvironmentButton).toBeEnabled();
        await confirmEnvironmentButton.click();
        await expect(environmentDialog).toBeHidden();
    }
    await expect.poll(async () => page.evaluate(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return {
            selectedEnvironment: state.selectedEnvironment?.name || null,
            showEnvModal: state.showEnvModal,
            authStatus: state.authStatus,
            hierarchyStatus: state.hierarchyStatus
        };
    })).toEqual({
        selectedEnvironment: 'Environment E1',
        showEnvModal: false,
        authStatus: 'authenticated',
        hierarchyStatus: 'ready'
    });
    await expect(page.getByTestId('organization-breadcrumb')).toContainText('Environment E1');
};

let orchestrator;

test.beforeAll(async () => {
    orchestrator = start(process.execPath, ['scripts/dev-tamar.cjs'], {
        TAMAR_DEV_BACKEND_PORT: '14000',
        TAMAR_DEV_LOCAL_AUTH_PORT: '14100',
        TAMAR_DEV_FRONTEND_PORT: String(FRONTEND_PORT)
    });
    await waitForOutput(orchestrator, '"event":"dev-tamar.ready"');
    await waitForHttp(FRONTEND_URL);
});

test.afterAll(async () => {
    try { await cleanupOwnedRecords(); } finally { await stopTree(orchestrator?.child); }
});

test('HIERARCHY-E2E-001 canonical breadcrumb and authorized server-backed creation persist after refresh', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('requestfailed', (request) => {
        if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push(request.method() + ' ' + request.url());
    });

    await login(page);
    await expectBreadcrumbOrder(page, ['Environment E1']);
    await expect(page.getByTestId('organization-breadcrumb')).not.toContainText('כל הסביבות');

    const existingSubEnvironment = page.locator('[data-testid="organization-entity-card"]').filter({ hasText: 'SubEnvironment SE1' });
    await existingSubEnvironment.getByTestId('organization-entity-open').click();
    await expectBreadcrumbOrder(page, ['Environment E1', 'SubEnvironment SE1']);

    const existingRoom = page.locator('[data-testid="organization-entity-card"]').filter({ hasText: 'Room A' });
    await existingRoom.click();
    await expectBreadcrumbOrder(page, ['Environment E1', 'SubEnvironment SE1', 'Room A']);

    await page.locator('[data-breadcrumb-segment="subEnvironment"]').click();
    await expectBreadcrumbOrder(page, ['Environment E1', 'SubEnvironment SE1']);
    await page.locator('[data-breadcrumb-segment="environment"]').click();
    await expectBreadcrumbOrder(page, ['Environment E1']);
    await expect(page.getByTestId('organization-create-action')).toHaveText(/יצירת תת-סביבה/);

    await page.getByTestId('organization-create-action').click();
    await page.getByTestId('organization-create-name').fill(subEnvironmentName);
    await page.getByTestId('organization-create-description').fill('Created by isolated hierarchy E2E');
    const subResponsePromise = page.waitForResponse((response) => response.url().includes('/api/environments/') && response.url().endsWith('/sub-environments') && response.request().method() === 'POST');
    await page.getByTestId('organization-create-submit').click();
    const subResponse = await subResponsePromise;
    expect(subResponse.status()).toBe(201);
    const subPayload = await subResponse.json();
    createdIds.subEnvironmentId = subPayload.data.id;
    expect(createdIds.subEnvironmentId).toMatch(/^[a-f0-9]{24}$/);
    await expect(page.getByTestId('organization-create-dialog')).toHaveCount(0);
    const createdSubCard = page.locator('[data-testid="organization-entity-card"]').filter({ hasText: subEnvironmentName });
    await expect(createdSubCard).toBeVisible();
    await createdSubCard.getByTestId('organization-entity-open').click();

    const breadcrumb = page.getByTestId('organization-breadcrumb');
    await expectBreadcrumbOrder(page, ['Environment E1', subEnvironmentName]);
    await expect(breadcrumb).not.toContainText('תת־סביבות');
    await expect(page.getByTestId('organization-create-action')).toHaveText(/יצירת חדר/);

    await page.getByTestId('organization-create-action').click();
    await page.getByTestId('organization-create-name').fill(roomName);
    const roomResponsePromise = page.waitForResponse((response) => response.url().includes('/api/sub-environments/') && response.url().endsWith('/rooms') && response.request().method() === 'POST');
    await page.getByTestId('organization-create-submit').click();
    const roomResponse = await roomResponsePromise;
    expect(roomResponse.status()).toBe(201);
    const roomPayload = await roomResponse.json();
    createdIds.roomId = roomPayload.data.id;
    expect(createdIds.roomId).toMatch(/^[a-f0-9]{24}$/);
    await page.waitForFunction(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return state.hierarchyStatus === 'loading';
    });
    await page.waitForFunction(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return state.hierarchyStatus === 'ready';
    });
    await expect(page.getByText('החדר נוצר ונשמר בהצלחה.')).toBeVisible();
    await expect(page.locator('[data-testid="organization-entity-card"]').filter({ hasText: roomName })).toBeVisible();
    await expectBreadcrumbOrder(page, ['Environment E1', subEnvironmentName, roomName]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await login(page);
    const persistedSub = page.locator('[data-testid="organization-entity-card"]').filter({ hasText: subEnvironmentName });
    await expect(persistedSub).toBeVisible();
    await persistedSub.getByTestId('organization-entity-open').click();
    await expect(page.locator('[data-testid="organization-entity-card"]').filter({ hasText: roomName })).toBeVisible();

    const session = await page.evaluate(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return { role: state.memberships[0]?.role, capability: state.capabilities.organizationHierarchy };
    });
    expect(session.role).toBe('SUPER_ADMIN');
    expect(session.capability.canCreateRoom).toBe(true);
    expect(session.capability.systemIds).toHaveLength(1);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);

    fs.mkdirSync(path.join(ROOT, '.codex-artifacts'), { recursive: true });
    await page.screenshot({ path: path.join(ROOT, '.codex-artifacts', 'hierarchy-management-e2e.png'), fullPage: true });
    await context.close();
});
