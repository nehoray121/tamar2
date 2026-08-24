const { test, expect } = require('@playwright/test');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const BACKEND_PORT = 34200;
const LOCAL_AUTH_PORT = 34300;
const FRONTEND_PORT = 35211;
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

const waitForOutput = async (started, marker, timeoutMs = 60000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (started.output.join('').includes(marker)) return;
        if (started.child.exitCode !== null) {
            throw new Error(
                `Process exited before ${marker}: `
                + started.output.join('').slice(-4000)
            );
        }
        await sleep(100);
    }
    throw new Error(`Timed out waiting for process output: ${marker}`);
};

const waitForHttp = async (url, timeoutMs = 60000) => {
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
        spawnSync(
            'taskkill.exe',
            ['/pid', String(child.pid), '/t', '/f'],
            { stdio: 'ignore', windowsHide: true }
        );
    } else {
        child.kill('SIGTERM');
    }
    await Promise.race([
        once(child, 'exit').catch(() => {}),
        sleep(5000)
    ]);
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

const login = async (page, personalNumber) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await page
        .locator('input[name="local-development-personal-number"]')
        .fill(personalNumber);
    await page.locator('form button[type="submit"]').click();
    await page.waitForFunction(async () => {
        const state = (
            await import('/src/store/session.store.js')
        ).useSessionStore.getState();
        return state.authStatus === 'authenticated';
    });
};

const api = async (page, pathName, options = {}) => page.evaluate(
    async ({ pathName: requestPath, options: requestOptions }) => {
        const { authenticatedHttpClient } = await import(
            '/src/features/tickets/boards/api/authenticatedHttpClient.js'
        );
        try {
            const response = await authenticatedHttpClient(
                requestPath,
                requestOptions
            );
            return {
                ok: true,
                data: response.data,
                etag: response.etag || null
            };
        } catch (error) {
            return {
                ok: false,
                status: Number(error?.status) || 0,
                code: error?.code || null,
                message: error?.message || String(error)
            };
        }
    },
    { pathName, options }
);

const ticketsApi = async (page, method, args) => page.evaluate(
    async ({ method: methodName, args: methodArgs }) => {
        const { ticketsApi: client } = await import(
            '/src/features/tickets/api/ticketsApi.js'
        );
        try {
            const response = await client[methodName](...methodArgs);
            return { ok: true, data: response.data };
        } catch (error) {
            return {
                ok: false,
                status: Number(error?.status) || 0,
                code: error?.code || null,
                message: error?.message || String(error)
            };
        }
    },
    { method, args }
);

const boardApi = async (page, method, args) => page.evaluate(
    async ({ method: methodName, args: methodArgs }) => {
        const { ticketBoardsApi: client } = await import(
            '/src/features/tickets/boards/api/ticketBoardsApi.js'
        );
        try {
            const response = await client[methodName](methodArgs);
            return {
                ok: true,
                data: response.data,
                etag: response.etag || null
            };
        } catch (error) {
            return {
                ok: false,
                status: Number(error?.status) || 0,
                code: error?.code || null,
                message: error?.message || String(error)
            };
        }
    },
    { method, args }
);

const createUser = async (
    page,
    {
        personalNumber,
        displayName,
        role,
        scope
    }
) => {
    const result = await api(page, '/api/users', {
        method: 'POST',
        body: {
            personalNumber,
            displayName,
            role,
            scope
        }
    });
    expect(result, result.message).toMatchObject({ ok: true });
    return result.data;
};

test('PHASE11 full frontend-server workflow and role matrix', async ({
    browser
}) => {
    const superContext = await browser.newContext();
    const superPage = await superContext.newPage();
    await login(superPage, '1234567');

    const seed = await superPage.evaluate(async () => {
        const state = (
            await import('/src/store/session.store.js')
        ).useSessionStore.getState();
        return {
            hierarchy: state.organizationHierarchy,
            user: state.currentUser
        };
    });

    const seedEnvironment = seed.hierarchy.environments[0];
    const seedSubEnvironment = seed.hierarchy.subEnvironments.find(
        (item) => item.environmentId === seedEnvironment.id
    );
    const seedRoom = seed.hierarchy.rooms.find(
        (item) => item.subEnvironmentId === seedSubEnvironment.id
    );
    expect(seedEnvironment).toBeTruthy();
    expect(seedSubEnvironment).toBeTruthy();
    expect(seedRoom).toBeTruthy();

    const systemId = seedEnvironment.systemId;
    const environmentResult = await api(
        superPage,
        `/api/systems/${systemId}/environments`,
        {
            method: 'POST',
            body: {
                name: 'סביבת בדיקות הרשאות',
                description: 'נוצרה בבדיקת Phase 11'
            }
        }
    );
    expect(environmentResult, environmentResult.message)
        .toMatchObject({ ok: true });
    const environment = environmentResult.data;

    const subEnvironmentResult = await api(
        superPage,
        `/api/environments/${environment.id}/sub-environments`,
        {
            method: 'POST',
            body: {
                name: 'תת סביבת בדיקות',
                description: 'תת סביבה לבדיקת הרשאות'
            }
        }
    );
    expect(subEnvironmentResult, subEnvironmentResult.message)
        .toMatchObject({ ok: true });
    const subEnvironment = subEnvironmentResult.data;

    const roomResult = await api(
        superPage,
        `/api/sub-environments/${subEnvironment.id}/rooms`,
        {
            method: 'POST',
            body: {
                name: 'חדר יעד Phase 11',
                description: 'חדר לבדיקת העברת פניות'
            }
        }
    );
    expect(roomResult, roomResult.message).toMatchObject({ ok: true });
    const destinationRoom = roomResult.data;

    const defaultSettings = await api(
        superPage,
        `/api/settings/rooms/${destinationRoom.id}`
    );
    expect(defaultSettings, defaultSettings.message).toMatchObject({
        ok: true
    });
    expect(defaultSettings.data.version).toBe(1);
    expect(defaultSettings.data.value.fields.length).toBeGreaterThan(5);
    expect(defaultSettings.data.value.general.inquiriesPerPage).toBe(7);

    const environmentScope = {
        scopeType: 'ENVIRONMENT',
        scopeId: environment.id,
        systemId,
        environmentId: environment.id
    };
    const subEnvironmentScope = {
        scopeType: 'SUB_ENVIRONMENT',
        scopeId: subEnvironment.id,
        systemId,
        environmentId: environment.id,
        subEnvironmentId: subEnvironment.id
    };
    const destinationRoomScope = {
        scopeType: 'ROOM',
        scopeId: destinationRoom.id,
        systemId,
        environmentId: environment.id,
        subEnvironmentId: subEnvironment.id,
        roomId: destinationRoom.id
    };

    await createUser(superPage, {
        personalNumber: '7000001',
        displayName: 'מנהל סביבת בדיקות',
        role: 'ENVIRONMENT_ADMIN',
        scope: environmentScope
    });
    await createUser(superPage, {
        personalNumber: '7000002',
        displayName: 'מנהל תת סביבת בדיקות',
        role: 'SYSTEM_ADMIN',
        scope: subEnvironmentScope
    });
    await createUser(superPage, {
        personalNumber: '7000003',
        displayName: 'מנהל חדר בדיקות',
        role: 'ROOM_MANAGER',
        scope: destinationRoomScope
    });
    await createUser(superPage, {
        personalNumber: '7000004',
        displayName: 'משתמש חדר בדיקות',
        role: 'ROOM_USER',
        scope: destinationRoomScope
    });

    const ticketResult = await ticketsApi(superPage, 'create', [{
        roomId: seedRoom.id,
        subject: 'בדיקת הרשאות מלאה',
        description: 'פנייה שנוצרה כדי לבדוק את כל זרימת העבודה.',
        priority: 'HIGH',
        fieldValues: {
            customerId: 'phase11-customer',
            customerName: 'לקוח בדיקות',
            phone: '0500000000',
            handler: seedRoom.name,
            treatment: 'הפנייה בטיפול'
        }
    }]);
    expect(ticketResult, ticketResult.message).toMatchObject({ ok: true });
    let ticket = ticketResult.data;

    const sourceDashboardBefore = await api(
        superPage,
        `/api/dashboard?roomId=${seedRoom.id}&grouping=monthly`
    );
    expect(sourceDashboardBefore.data.metrics.total).toBe(1);

    const transferResult = await ticketsApi(
        superPage,
        'initiateTransfer',
        [
            ticket.id,
            {
                destinationRoomId: destinationRoom.id,
                reason: 'בדיקת שליחה לחדר יעד'
            },
            ticket.version
        ]
    );
    expect(transferResult, transferResult.message).toMatchObject({
        ok: true
    });
    const transfer = transferResult.data.transfer;
    ticket = transferResult.data.ticket;

    const sourceDashboardAfterTransfer = await api(
        superPage,
        `/api/dashboard?roomId=${seedRoom.id}&grouping=monthly`
    );
    const destinationDashboardAfterTransfer = await api(
        superPage,
        `/api/dashboard?roomId=${destinationRoom.id}&grouping=monthly`
    );
    expect(sourceDashboardAfterTransfer.data.metrics.total).toBe(0);
    expect(destinationDashboardAfterTransfer.data.metrics.total).toBe(1);

    const roomUserContext = await browser.newContext();
    const roomUserPage = await roomUserContext.newPage();
    await login(roomUserPage, '7000004');

    const roomUserSettingsWrite = await api(
        roomUserPage,
        `/api/settings/rooms/${destinationRoom.id}`,
        {
            method: 'PUT',
            headers: { 'If-Match': '"1"' },
            body: { value: defaultSettings.data.value }
        }
    );
    expect(roomUserSettingsWrite.ok).toBe(false);
    expect(roomUserSettingsWrite.status).toBe(403);
    expect(roomUserSettingsWrite.code).toBe(
        'SETTINGS_UPDATE_FORBIDDEN'
    );

    const roomUserCreateRoom = await api(
        roomUserPage,
        `/api/sub-environments/${subEnvironment.id}/rooms`,
        {
            method: 'POST',
            body: { name: 'אסור למשתמש', description: '' }
        }
    );
    expect(roomUserCreateRoom.ok).toBe(false);
    expect(roomUserCreateRoom.status).toBe(403);

    const receivedBoard = await boardApi(
        roomUserPage,
        'getBoardItems',
        {
            roomId: destinationRoom.id,
            boardType: 'EXTERNAL_RECEIVED',
            query: { page: 1, limit: 20 }
        }
    );
    expect(receivedBoard, receivedBoard.message).toMatchObject({
        ok: true
    });
    expect(receivedBoard.data.items).toHaveLength(1);
    expect(
        receivedBoard.data.items[0].transfer.externalState
    ).toBe('PENDING');

    const acceptDetail = await ticketsApi(
        roomUserPage,
        'get',
        [ticket.id]
    );
    expect(acceptDetail.data.capabilities.canAcceptTransfer).toBe(true);

    const accepted = await ticketsApi(
        roomUserPage,
        'acceptTransfer',
        [transfer.id, acceptDetail.data.version]
    );
    expect(accepted, accepted.message).toMatchObject({ ok: true });
    ticket = accepted.data.ticket;

    const edited = await ticketsApi(
        roomUserPage,
        'update',
        [
            ticket.id,
            {
                subject: 'עודכן על ידי משתמש חדר',
                description: 'תוכן הפנייה נערך על ידי משתמש רגיל בחדר.',
                priority: ticket.priority,
                fieldValues: {
                    ...ticket.fieldValues,
                    treatment: 'טופל במקום'
                }
            },
            ticket.version
        ]
    );
    expect(edited, edited.message).toMatchObject({ ok: true });
    ticket = edited.data;

    const history = await ticketsApi(
        roomUserPage,
        'history',
        [ticket.id, {
            page: 1,
            limit: 100,
            sortDirection: 'desc'
        }]
    );
    expect(history, history.message).toMatchObject({ ok: true });
    const updateEvent = history.data.items.find(
        (entry) => entry.eventType === 'TICKET_UPDATED'
    );
    expect(updateEvent).toBeTruthy();
    expect(updateEvent.actor.displayName).toBe('משתמש חדר בדיקות');
    expect(updateEvent.createdAt).toBeTruthy();

    const userCategoryCreate = await boardApi(
        roomUserPage,
        'createBoardCategory',
        {
            roomId: destinationRoom.id,
            boardType: 'OPEN',
            input: {
                name: 'קטגוריה אסורה למשתמש',
                color: '#3B82F6'
            }
        }
    );
    expect(userCategoryCreate.ok).toBe(false);
    expect(userCategoryCreate.status).toBe(403);

    const openState = await boardApi(
        roomUserPage,
        'getBoardItemState',
        {
            roomId: destinationRoom.id,
            boardType: 'OPEN',
            itemId: ticket.id
        }
    );
    expect(openState, openState.message).toMatchObject({ ok: true });

    const pinned = await boardApi(
        roomUserPage,
        'updateBoardItemState',
        {
            roomId: destinationRoom.id,
            boardType: 'OPEN',
            itemId: ticket.id,
            input: { isPinned: true },
            ifMatch: openState.etag || '"0"'
        }
    );
    expect(pinned, pinned.message).toMatchObject({ ok: true });
    expect(pinned.data.isPinned).toBe(true);

    const closed = await api(
        roomUserPage,
        `/api/tickets/${ticket.id}/close`,
        {
            method: 'POST',
            headers: { 'If-Match': `"${ticket.version}"` },
            body: {
                closureSummary: 'הפנייה נסגרה על ידי משתמש חדר.'
            }
        }
    );
    expect(closed, closed.message).toMatchObject({ ok: true });

    const sentBoardAfterClose = await boardApi(
        superPage,
        'getBoardItems',
        {
            roomId: seedRoom.id,
            boardType: 'EXTERNAL_SENT',
            query: { page: 1, limit: 20 }
        }
    );
    expect(sentBoardAfterClose, sentBoardAfterClose.message)
        .toMatchObject({ ok: true });
    expect(
        sentBoardAfterClose.data.items[0].transfer.externalState
    ).toBe('DONE');

    const secondTicket = await ticketsApi(superPage, 'create', [{
        roomId: seedRoom.id,
        subject: 'בדיקת ביטול העברה',
        description: 'פנייה לבדיקת ביטול.',
        priority: 'MEDIUM',
        fieldValues: { customerId: 'phase11-cancel' }
    }]);
    const secondTransfer = await ticketsApi(
        superPage,
        'initiateTransfer',
        [
            secondTicket.data.id,
            {
                destinationRoomId: destinationRoom.id,
                reason: 'בדיקת ביטול על ידי חדר יעד'
            },
            secondTicket.data.version
        ]
    );
    const cancelDetail = await ticketsApi(
        roomUserPage,
        'get',
        [secondTicket.data.id]
    );
    expect(cancelDetail.data.capabilities.canCancelTransfer).toBe(true);

    const cancelled = await ticketsApi(
        roomUserPage,
        'cancelTransfer',
        [
            secondTransfer.data.transfer.id,
            cancelDetail.data.version,
            'העברה בוטלה בבדיקת הרשאות'
        ]
    );
    expect(cancelled, cancelled.message).toMatchObject({ ok: true });

    const environmentAdminContext = await browser.newContext();
    const environmentAdminPage = await environmentAdminContext.newPage();
    await login(environmentAdminPage, '7000001');
    const envAdminSub = await api(
        environmentAdminPage,
        `/api/environments/${environment.id}/sub-environments`,
        {
            method: 'POST',
            body: {
                name: 'תת סביבה שנוצרה על ידי מנהל סביבה',
                description: ''
            }
        }
    );
    expect(envAdminSub, envAdminSub.message).toMatchObject({ ok: true });

    const systemAdminContext = await browser.newContext();
    const systemAdminPage = await systemAdminContext.newPage();
    await login(systemAdminPage, '7000002');
    const systemAdminRoom = await api(
        systemAdminPage,
        `/api/sub-environments/${subEnvironment.id}/rooms`,
        {
            method: 'POST',
            body: {
                name: 'חדר שנוצר על ידי מנהל תת סביבה',
                description: ''
            }
        }
    );
    expect(systemAdminRoom, systemAdminRoom.message).toMatchObject({
        ok: true
    });
    const systemAdminSub = await api(
        systemAdminPage,
        `/api/environments/${environment.id}/sub-environments`,
        {
            method: 'POST',
            body: {
                name: 'אסור למנהל תת סביבה',
                description: ''
            }
        }
    );
    expect(systemAdminSub.ok).toBe(false);
    expect(systemAdminSub.status).toBe(403);

    const roomManagerContext = await browser.newContext();
    const roomManagerPage = await roomManagerContext.newPage();
    await login(roomManagerPage, '7000003');
    const managerRoom = await api(
        roomManagerPage,
        `/api/sub-environments/${subEnvironment.id}/rooms`,
        {
            method: 'POST',
            body: {
                name: 'חדר שנוצר על ידי מנהל חדר',
                description: ''
            }
        }
    );
    expect(managerRoom, managerRoom.message).toMatchObject({ ok: true });

    await Promise.all([
        roomManagerContext.close(),
        systemAdminContext.close(),
        environmentAdminContext.close(),
        roomUserContext.close(),
        superContext.close()
    ]);
});
