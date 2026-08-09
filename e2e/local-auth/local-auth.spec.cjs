const { test, expect } = require('@playwright/test');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const BACKEND_PORT = 24000;
const LOCAL_AUTH_PORT = 24100;
const FRONTEND_PORT = 25174;
const PRODUCTION_LIKE_PORT = 25175;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const PRODUCTION_LIKE_URL = `http://127.0.0.1:${PRODUCTION_LIKE_PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForHttp = async (url, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try { const response = await fetch(url); if (response.ok) return; } catch {}
        await sleep(200);
    }
    throw new Error('Timed out waiting for ' + url);
};
const stopTree = async (child) => {
    if (!child) return;
    if (process.platform === 'win32') {
        spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    } else {
        child.kill('SIGTERM');
    }
    await Promise.race([once(child, 'exit').catch(() => {}), sleep(5000)]);
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
const start = async (command, args, options = {}) => {
    const output = [];
    const child = spawn(command, args, {
        cwd: options.cwd || ROOT,
        env: options.env || process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });
    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));
    child.once('error', (error) => output.push(error.message));
    return { child, output };
};

let orchestrator;
let productionVite;

test.beforeAll(async () => {
    orchestrator = await start(process.execPath, ['scripts/dev-tamar.cjs'], {
        env: {
            ...process.env,
            TAMAR_DEV_BACKEND_PORT: String(BACKEND_PORT),
            TAMAR_DEV_LOCAL_AUTH_PORT: String(LOCAL_AUTH_PORT),
            TAMAR_DEV_FRONTEND_PORT: String(FRONTEND_PORT)
        }
    });
    await waitForOutput(orchestrator, '"event":"dev-tamar.ready"');
    await waitForHttp(FRONTEND_URL);
    const viteCli = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    productionVite = await start(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(PRODUCTION_LIKE_PORT), '--strictPort'], {
        env: { ...process.env, VITE_API_PROXY_TARGET: `http://127.0.0.1:${BACKEND_PORT}` }
    });
    await waitForHttp(PRODUCTION_LIKE_URL);
});

test.afterAll(async () => {
    await stopTree(productionVite?.child);
    await stopTree(orchestrator?.child);
});

const openLocalLogin = async (browser) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
    const page = await context.newPage();
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'כניסה מקומית לתמר' })).toBeVisible();
    return { context, page };
};
const login = async (page, personalNumber) => {
    await page.locator('input[name="local-development-personal-number"]').fill(personalNumber);
    await page.getByRole('button', { name: 'כניסה', exact: true }).click();
};

test('LOCAL-AUTH-E2E-001 real local login resolves MongoDB membership and supports the application shell', async ({ browser }) => {
    const { context, page } = await openLocalLogin(browser);
    const tokenRequests = [];
    const backendLoginRequests = [];
    const authMeResponses = [];
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
        const errorText = request.failure()?.errorText || 'unknown failure';
        // Rapid route changes intentionally cancel in-flight board requests.
        if (errorText !== 'net::ERR_ABORTED') {
            failedRequests.push(`${request.method()} ${request.url()} ${errorText}`);
        }
    });
    page.on('request', (request) => {
        if (request.url().includes(`:${LOCAL_AUTH_PORT}/token`)) tokenRequests.push(request.url());
        if (/\/api\/(?:auth\/personal-number|dev-login)/.test(request.url())) backendLoginRequests.push(request.url());
    });
    page.on('response', (response) => {
        if (response.url().includes('/api/auth/me')) authMeResponses.push(response.status());
    });
    const artifacts = path.join(ROOT, '.codex-artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'local-auth-login.png'), fullPage: true });
    await login(page, '1234567');
    await expect(page.getByRole('dialog', { name: 'בחירת סביבה' })).toBeVisible();
    await expect(page.getByText('Environment E1', { exact: true })).toBeVisible();
    await page.getByTestId('organization-environment-option').click();
    await page.getByTestId('organization-environment-confirm').click();
    await expect(page.getByTestId('organization-entity-card').getByText('SubEnvironment SE1', { exact: true })).toBeVisible();
    await page.getByTestId('organization-entity-open').first().click();
    await expect(page.getByTestId('organization-entity-card').getByText('Room A', { exact: true })).toBeVisible();
    const roomA = page.locator('[data-testid="organization-entity-card"]').filter({ hasText: 'Room A' });
    await roomA.getByTestId('organization-entity-open').click();
    await expect.poll(() => page.evaluate(async () => (await import('/src/store/session.store.js')).useSessionStore.getState().authStatus)).toBe('authenticated');
    const session = await page.evaluate(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return {
            role: state.memberships[0]?.role,
            roomName: state.selectedRoom?.name,
            userName: state.currentUser?.displayName,
            tokenPersisted: Object.keys(localStorage).some((key) => /token|personal/i.test(key))
                || Object.keys(sessionStorage).some((key) => /token|personal/i.test(key))
        };
    });
    expect(session.role).toBe('SUPER_ADMIN');
    expect(session.roomName).toBe('Room A');
    expect(session.userName).toBe('Development SUPER_ADMIN Local');
    expect(session.tokenPersisted).toBe(false);
    for (const view of ['dashboard', 'open_complaints', 'history', 'external', 'my_tasks', 'new_complaint', 'settings', 'hierarchy', 'user_management', 'super_admin']) {
        await page.evaluate(async (currentView) => (await import('/src/store/session.store.js')).useSessionStore.setState({ currentView }), view);
        await page.waitForTimeout(120);
        await expect(page.locator('#root')).toBeVisible();
        await expect(page.getByText('לא ניתן לפתוח את תמר', { exact: true })).toHaveCount(0);
    }
    await page.screenshot({ path: path.join(artifacts, 'local-auth-authenticated.png'), fullPage: true });
    expect(tokenRequests).toHaveLength(1);
    expect(backendLoginRequests).toHaveLength(0);
    expect(authMeResponses).toContain(200);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    await page.getByRole('button', { name: 'איפוס התחברות מקומית' }).click();
    await expect(page.getByRole('heading', { name: 'כניסה מקומית לתמר' })).toBeVisible();
    await context.close();
});

test('LOCAL-AUTH-E2E-002 validation and unprovisioned identity access-request routing remain distinct', async ({ browser }) => {
    const invalid = await openLocalLogin(browser);
    await invalid.page.getByRole('button', { name: 'כניסה', exact: true }).click();
    await expect(invalid.page.getByRole('alert')).toContainText('7 או 9 ספרות');
    await login(invalid.page, '12345A7');
    await expect(invalid.page.getByRole('alert')).toContainText('7 או 9 ספרות');
    await login(invalid.page, '999999999');
    await invalid.page.waitForFunction(async () => {
        const state = (await import('/src/store/session.store.js')).useSessionStore.getState();
        return state.authStatus === 'authenticated'
            && state.currentView === 'access_requests'
            && state.memberships.length === 0;
    });
    await expect(invalid.page.locator('#root')).toBeVisible();
    await invalid.context.close();

});

test('LOCAL-AUTH-E2E-003 development without the explicit flag exposes only the organizational SSO error', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'he-IL' });
    const page = await context.newPage();
    const localTokenRequests = [];
    page.on('request', (request) => { if (request.url().includes(`:${LOCAL_AUTH_PORT}/token`)) localTokenRequests.push(request.url()); });
    await page.goto(PRODUCTION_LIKE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'לא ניתן לפתוח את תמר' })).toBeVisible();
    await expect(page.getByText('כניסה מקומית לתמר', { exact: true })).toHaveCount(0);
    await expect(page.locator('input[name="local-development-personal-number"]')).toHaveCount(0);
    expect(localTokenRequests).toHaveLength(0);
    await context.close();
});
