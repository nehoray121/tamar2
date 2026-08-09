const { test, expect } = require('@playwright/test');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const BACKEND_PORT = 34000;
const LOCAL_AUTH_PORT = 34100;
const FRONTEND_PORT = 35174;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
const waitForOutput = async (started, marker, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (started.output.join('').includes(marker)) return;
        if (started.child.exitCode !== null) {
            throw new Error(`Process exited before ${marker}: ${started.output.join('').slice(-1800)}`);
        }
        await sleep(100);
    }
    throw new Error(`Timed out waiting for process output: ${marker}`);
};
const waitForHttp = async (url, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {}
        await sleep(200);
    }
    throw new Error(`Timed out waiting for ${url}`);
};
const stopTree = async (child) => {
    if (!child) return;
    if (process.platform === 'win32') {
        spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
            stdio: 'ignore',
            windowsHide: true
        });
    } else {
        child.kill('SIGTERM');
    }
    await Promise.race([once(child, 'exit').catch(() => {}), sleep(5000)]);
};

let orchestrator;

test.beforeAll(async () => {
    orchestrator = start(process.execPath, [
        'scripts/dev-tamar.cjs',
        '--reset',
        '--confirm-reset=tamar_dev'
    ], {
        TAMAR_DEV_BACKEND_PORT: String(BACKEND_PORT),
        TAMAR_DEV_LOCAL_AUTH_PORT: String(LOCAL_AUTH_PORT),
        TAMAR_DEV_FRONTEND_PORT: String(FRONTEND_PORT)
    });
    await waitForOutput(orchestrator, '"event":"dev-tamar.ready"');
    await waitForHttp(FRONTEND_URL);
});

test.afterAll(async () => {
    await stopTree(orchestrator?.child);
});

const authenticateAndSelectRoom = async (page) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="local-development-personal-number"]').fill('1234567');
    await page.locator('form button[type="submit"]').click();

    const environmentOption = page.getByTestId('organization-environment-option').first();
    await expect(environmentOption).toBeVisible();
    await environmentOption.click();
    await page.getByTestId('organization-environment-confirm').click();

    await expect(page.getByTestId('organization-entity-open').first()).toBeVisible();
    await page.getByTestId('organization-entity-open').first().click();
    await expect(page.getByTestId('organization-entity-open').first()).toBeVisible();
    await page.getByTestId('organization-entity-open').first().click();

    await page.waitForFunction(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return state.authStatus === 'authenticated'
            && Boolean(state.selectedRoom?.id)
            && state.currentView === 'dashboard';
    });
};

const expectCleanDashboard = (payload) => {
    expect(payload.success).toBe(true);
    expect(payload.data.metrics).toMatchObject({
        total: 0,
        open: 0,
        closed: 0,
        overdue: 0,
        urgentOpen: 0,
        unassigned: 0,
        recentlyHandled: 0,
        openedToday: 0,
        averageHandlingHours: 0
    });
    for (const key of ['trend', 'activityTrend', 'priorityData', 'workload', 'attention', 'inquiries']) {
        expect(payload.data[key], `${key} must come back empty on a clean database`).toEqual([]);
    }
};

test('REAL-DATA-E2E-001 clean tamar_dev uses canonical APIs and never activates fallback business data', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const dashboardResponse = page.waitForResponse((response) => (
        response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/dashboard'
    ));
    await authenticateAndSelectRoom(page);
    const dashboardPayload = await (await dashboardResponse).json();
    expectCleanDashboard(dashboardPayload);
    await expect(page.locator('#root')).toBeVisible();

    const controlCenterResponse = page.waitForResponse((response) => (
        response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/control-center'
    ));
    await page.evaluate(async () => {
        (await import('/src/store/session.store.js')).useSessionStore.getState().navigate('super_admin');
    });
    const controlCenterPayload = await (await controlCenterResponse).json();
    expect(controlCenterPayload.success).toBe(true);
    expect(controlCenterPayload.data.organization.environments).toHaveLength(1);
    expect(controlCenterPayload.data.organization.subEnvironments).toHaveLength(1);
    expect(controlCenterPayload.data.organization.rooms).toHaveLength(3);
    expect(controlCenterPayload.data.users.rows).toHaveLength(1);
    expect(controlCenterPayload.data.overview.trend).toEqual([]);
    expect(controlCenterPayload.data.performance.workload).toEqual([]);
    expect(controlCenterPayload.data.checks).toEqual([]);

    const usersResponse = page.waitForResponse((response) => (
        response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/users'
    ));
    await page.evaluate(async () => {
        (await import('/src/store/session.store.js')).useSessionStore.getState().navigate('user_management');
    });
    const usersPayload = await (await usersResponse).json();
    expect(usersPayload.success).toBe(true);
    expect(usersPayload.data.items).toHaveLength(1);
    expect(usersPayload.data.pagination.totalItems).toBe(1);

    await page.route(/\/api\/dashboard(?:\?.*)?$/u, async (route) => {
        await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
                success: false,
                error: { code: 'E2E_BACKEND_UNAVAILABLE', message: 'E2E backend unavailable' }
            })
        });
    });
    await page.evaluate(async () => {
        (await import('/src/store/session.store.js')).useSessionStore.getState().navigate('dashboard');
    });
    const errorPanel = page.locator('div.border-red-300\\/40');
    await expect(errorPanel).toBeVisible();
    await expect(errorPanel.getByRole('button')).toBeVisible();

    await page.unroute(/\/api\/dashboard(?:\?.*)?$/u);
    const recoveredResponse = page.waitForResponse((response) => (
        response.request().method() === 'GET'
        && new URL(response.url()).pathname === '/api/dashboard'
        && response.status() === 200
    ));
    await errorPanel.getByRole('button').click();
    expectCleanDashboard(await (await recoveredResponse).json());
    await expect(errorPanel).toHaveCount(0);

    const layout = await page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        viewportWidth: document.documentElement.clientWidth
    }));
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth + 2);
    expect(pageErrors).toEqual([]);

    const artifacts = path.join(ROOT, '.codex-artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'real-data-clean-dashboard.png'), fullPage: true });
    await context.close();
});
