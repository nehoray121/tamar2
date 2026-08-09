import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const read = (relative) => readFile(resolve(process.cwd(), relative), 'utf8');

test('LOCAL-AUTH-FE-001 local modules are reachable only through explicit development dynamic imports', async () => {
    const runtime = await read('src/features/auth/runtimeAuthentication.js');
    const appShell = await read('src/components/layout/AppShell.jsx');
    assert.equal(runtime.includes('import.meta.env.DEV'), true);
    assert.equal(runtime.includes("VITE_TAMAR_LOCAL_PERSONAL_NUMBER_LOGIN === 'true'"), true);
    assert.equal(runtime.includes("import('./local/localDevelopmentAuth.js')"), true);
    assert.equal(runtime.includes("import('./local/LocalDevelopmentAuthUi.jsx')"), true);
    assert.equal(appShell.includes("from '../../features/auth/local/"), false);
});

test('LOCAL-AUTH-FE-002 local login accepts the approved seven-digit identity without weakening character validation', async () => {
    const ui = await read('src/features/auth/local/LocalDevelopmentAuthUi.jsx');
    assert.equal(ui.includes('^(?:[0-9]{7}|[0-9]{9})$'), true);
    assert.equal(ui.includes('7 או 9 ספרות'), true);
    assert.equal(ui.includes('maxLength={9}'), true);
});

test('LOCAL-AUTH-FE-003 local token and personal number remain memory-only', async () => {
    const source = [
        await read('src/features/auth/local/localDevelopmentAuth.js'),
        await read('src/features/auth/local/LocalDevelopmentAuthUi.jsx')
    ].join('\n');
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i);
    assert.doesNotMatch(source, /console\.(?:log|warn|error)/);
    assert.doesNotMatch(source, /role selector|SUPER_ADMIN/i);
    assert.equal(source.includes("let accessToken = ''"), true);
});

test('LOCAL-AUTH-FE-004 local provider URL is loopback validated and no SSO fallback exists', async () => {
    const local = await read('src/features/auth/local/localDevelopmentAuth.js');
    const runtime = await read('src/features/auth/runtimeAuthentication.js');
    assert.equal(local.includes('isLoopbackHostname'), true);
    assert.equal(local.includes("url.protocol !== 'http:'"), true);
    assert.equal(runtime.split(/\r?\n/).some((line) => line.includes('catch') && line.includes('local-personal-number')), false);
});

test('LOCAL-AUTH-FE-005 protected application is gated by explicit authentication states', async () => {
    const shell = await read('src/components/layout/AppShell.jsx');
    const store = await read('src/store/session.store.js');
    for (const state of ['initializing', 'local-login-required', 'obtaining-token', 'authenticated', 'unavailable', 'expired', 'forbidden', 'failed']) {
        assert.equal((shell + store).includes(state), true, state);
    }
    assert.equal(store.includes('loadRuntimeOrganizationContext'), true);
    assert.equal(store.includes('USER_NOT_PROVISIONED'), true);
    assert.equal(store.includes('NO_ACTIVE_MEMBERSHIPS'), true);
});
