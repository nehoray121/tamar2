const { createServer } = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const FRONTEND_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = path.join(FRONTEND_ROOT, 'tamar-server');
const fromBackend = (relativePath) => require(path.join(BACKEND_ROOT, relativePath));
const createApp = fromBackend('src/app.js');
const createServiceContainer = fromBackend('src/services/createServiceContainer.js');
const { closeSocket, initializeSocket } = fromBackend('src/socket/initializeSocket.js');
const User = fromBackend('src/models/User.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = fromBackend('tests/helpers/testDatabase.js');
const { createAuthConfig, createTestConfig, getAuthKeys, initializeAuthKeys, signToken } = fromBackend('tests/helpers/authFixture.js');
const { addMembership, createPhase7aFixture, createUser } = fromBackend('tests/helpers/phase7aFixture.js');
const { ROLES } = fromBackend('src/domain/access/constants.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const getAvailablePort = () => new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
        const port = probe.address().port;
        probe.close((error) => error ? reject(error) : resolve(port));
    });
});
const listen = (server, port) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
    });
});
const closeServer = (server) => new Promise((resolve, reject) => {
    if (!server || !server.listening) return resolve();
    server.close((error) => error ? reject(error) : resolve());
    if (server.closeIdleConnections) server.closeIdleConnections();
});
const waitForHttp = async (url, timeoutMs = 20000) => {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch (error) {
            lastError = error;
        }
        await sleep(100);
    }
    throw new Error('Timed out waiting for ' + url + ': ' + (lastError ? lastError.message : 'not ready'));
};
const toId = (value) => String((value && (value._id || value.id)) || value);

class Phase9VHarness {
    constructor() {
        this.jwksRequests = 0;
        this.contexts = new Set();
        this.tokens = {};
    }

    async start() {
        process.env.NODE_ENV = 'test';
        await initializeAuthKeys();
        await connectTestDatabase();
        await clearTestCollections();
        const ports = await Promise.all([getAvailablePort(), getAvailablePort(), getAvailablePort()]);
        this.ports = { jwksPort: ports[0], backendPort: ports[1], frontendPort: ports[2] };
        this.frontendUrl = 'http://127.0.0.1:' + ports[2];
        this.backendUrl = 'http://127.0.0.1:' + ports[1];

        const jwks = getAuthKeys().jwks;
        this.jwksServer = createServer((request, response) => {
            if (request.url !== '/jwks') {
                response.writeHead(404).end();
                return;
            }
            this.jwksRequests += 1;
            response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify(jwks));
        });
        await listen(this.jwksServer, ports[0]);

        const auth = createAuthConfig({ jwksUri: 'http://127.0.0.1:' + ports[0] + '/jwks' });
        this.config = Object.assign(createTestConfig(auth), { clientOrigins: [this.frontendUrl] });
        this.services = createServiceContainer({ config: this.config, logger });
        this.httpServer = createServer(createApp({ config: this.config, logger, services: this.services }));
        this.io = initializeSocket({ httpServer: this.httpServer, config: this.config, logger, services: this.services });
        [
            this.services.realtimePublisher,
            this.services.tickets.realtimePublisher,
            this.services.tickets.assignmentRealtimePublisher,
            this.services.tickets.transferRealtimePublisher,
            this.services.tickets.messageRealtimePublisher,
            this.services.tickets.boardRealtimePublisher
        ].forEach((publisher) => {
            if (publisher) publisher.setIo(this.io);
        });
        await listen(this.httpServer, ports[1]);
        await this.seed();

        const viteBin = path.join(FRONTEND_ROOT, 'node_modules/vite/bin/vite.js');
        this.viteProcess = spawn(process.execPath, [
            viteBin, '--host', '127.0.0.1', '--port', String(ports[2]), '--strictPort'
        ], {
            cwd: FRONTEND_ROOT,
            env: Object.assign({}, process.env, {
                NODE_ENV: 'test',
                VITE_API_PROXY_TARGET: this.backendUrl
            }),
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        });
        const viteErrors = [];
        this.viteProcess.stderr.on('data', (chunk) => viteErrors.push(String(chunk)));
        this.viteProcess.once('exit', (code) => {
            if (code) this.viteExitError = 'Vite exited ' + code + ': ' + viteErrors.join('').slice(-2000);
        });
        await waitForHttp(this.frontendUrl);
        if (this.viteExitError) throw new Error(this.viteExitError);
        this.browser = await chromium.launch({ channel: 'msedge', headless: true });
        return this;
    }

    async seed() {
        const data = await createPhase7aFixture(this.services, 'phase9v');
        const graphFor = (room) => ({
            system: data.system,
            environment: data.environment,
            subEnvironment: data.subEnvironment,
            room
        });
        const a2 = await createUser(this.services, 'Phase 9V User A2');
        const c1 = await createUser(this.services, 'Phase 9V User C1');
        await Promise.all([
            addMembership(this.services, a2, ROLES.ROOM_USER, graphFor(data.rooms.a)),
            addMembership(this.services, c1, ROLES.ROOM_USER, graphFor(data.rooms.c))
        ]);
        const actors = {
            A1: data.users.sourceUser,
            A2: a2,
            A_MANAGER: data.users.sourceManager,
            B1: data.users.destinationUser,
            B_MANAGER: data.users.destinationManager,
            C1: c1,
            C_MANAGER: data.users.thirdManager,
            SYSTEM_ADMIN: data.users.systemAdmin
        };
        let identityIndex = 0;
        for (const key of Object.keys(actors)) {
            identityIndex += 1;
            const user = actors[key];
            const subject = 'phase9v-' + key.toLowerCase();
            const personalNumber = '98' + String(identityIndex).padStart(5, '0');
            const protectedNumber = this.services.auth.personalNumberService.protect(personalNumber);
            await User.updateOne({ _id: user._id }, { $set: {
                externalIdentity: { provider: this.config.auth.providerKey, subject },
                personalNumberLookupHash: protectedNumber.lookupHash,
                personalNumberLast4: protectedNumber.last4
            } });
            this.tokens[key] = await signToken({
                subject,
                personalNumber,
                displayName: user.displayName,
                email: user.email,
                expiresIn: '30m'
            });
        }

        const createTicket = (actor, room, subject) => this.services.tickets.ticketService.create(actor._id, {
            roomId: toId(room),
            subject,
            description: subject + ' authenticated Phase 9-V fixture',
            priority: 'MEDIUM'
        });
        const openA = await createTicket(actors.A1, data.rooms.a, 'P9V OPEN Room A');
        const closedA = await createTicket(actors.A1, data.rooms.a, 'P9V CLOSED Room A');
        await this.services.tickets.ticketService.close(actors.A1._id, closedA.id, 1, 'Phase 9-V closed fixture');
        const bulkA1 = await createTicket(actors.A1, data.rooms.a, 'P9V BULK success');
        const bulkA2 = await createTicket(actors.A1, data.rooms.a, 'P9V BULK ineligible');
        const conflictA = await createTicket(actors.A1, data.rooms.a, 'P9V CONFLICT');
        const openB = await createTicket(actors.B1, data.rooms.b, 'P9V OPEN Room B');

        const first = await this.services.tickets.transferService.initiate(
            actors.A_MANAGER._id,
            data.ticket.id,
            1,
            { destinationRoomId: data.rooms.b._id, reason: 'P9V A to B' }
        );
        await this.services.tickets.transferService.accept(actors.B_MANAGER._id, first.transfer.id, 2);
        const second = await this.services.tickets.transferService.initiate(
            actors.B_MANAGER._id,
            data.ticket.id,
            3,
            { destinationRoomId: data.rooms.c._id, reason: 'P9V B to C' }
        );

        const roomEntries = Object.entries(data.rooms).map(([key, room]) => [key, {
            id: toId(room), backendId: toId(room), name: room.name
        }]);
        const actorEntries = Object.entries(actors).map(([key, user]) => [key, {
            id: toId(user), displayName: user.displayName
        }]);
        this.fixture = {
            system: toId(data.system),
            environment: toId(data.environment),
            subEnvironment: toId(data.subEnvironment),
            rooms: Object.fromEntries(roomEntries),
            actors: Object.fromEntries(actorEntries),
            tickets: {
                transfer: data.ticket.id,
                openA: openA.id,
                closedA: closedA.id,
                bulkA1: bulkA1.id,
                bulkA2: bulkA2.id,
                conflictA: conflictA.id,
                openB: openB.id
            },
            transfers: { ab: first.transfer.id, bc: second.transfer.id }
        };
    }

    async newPage(options = {}) {
        const actor = options.actor || 'A1';
        const room = options.room || 'a';
        const view = options.view || 'open_complaints';
        const token = this.tokens[actor];
        if (!token) throw new Error('Unknown actor ' + actor);
        const context = await this.browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'he-IL' });
        this.contexts.add(context);
        await context.addInitScript(({ accessToken }) => {
            Object.defineProperty(globalThis, '__TAMAR_AUTH__', {
                configurable: true,
                value: Object.freeze({ getAccessToken: async () => accessToken })
            });
        }, { accessToken: token });
        const page = await context.newPage();
        await page.goto(this.frontendUrl, { waitUntil: 'domcontentloaded' });
        const boardResponse = await this.setBoardContext(page, { room, view });
        return { context, page, boardResponse };
    }

    async setBoardContext(page, options = {}) {
        const room = options.room;
        const view = options.view;
        const waitForBoard = options.waitForBoard !== false;
        const selectedRoom = this.fixture.rooms[room];
        if (!selectedRoom) throw new Error('Unknown room ' + room);
        let responsePromise;
        if (waitForBoard && ['open_complaints', 'history', 'external'].includes(view)) {
            responsePromise = page.waitForResponse((response) => (
                response.request().method() === 'GET'
                && response.url().includes('/api/rooms/')
                && response.url().includes('/boards/')
                && response.url().includes('/items')
            ), { timeout: 15000 });
        }
        await page.evaluate(async ({ selectedRoom: nextRoom, currentView, environmentId }) => {
            const module = await import('/src/store/session.store.js');
            module.useSessionStore.setState({
                hasSelectedEnv: true,
                hasSelectedRoom: true,
                selectedEnvironment: { id: environmentId, backendId: environmentId, name: 'Phase 9-V Environment' },
                selectedRoom: nextRoom,
                currentView,
                showEnvModal: false
            });
        }, { selectedRoom, currentView: view, environmentId: this.fixture.environment });
        if (!responsePromise) return null;
        const response = await responsePromise;
        if (!response.ok()) throw new Error('Board load failed with ' + response.status() + ': ' + await response.text());
        return response;
    }

    async api(actor, pathName, options = {}) {
        const method = options.method || 'GET';
        const body = options.body;
        const response = await fetch(this.backendUrl + pathName, {
            method,
            headers: Object.assign({
                Authorization: 'Bearer ' + this.tokens[actor],
                Accept: 'application/json'
            }, body === undefined ? {} : { 'Content-Type': 'application/json' }, options.headers || {}),
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const text = await response.text();
        let payload = null;
        if (text) {
            try { payload = JSON.parse(text); } catch {}
        }
        return { response, body: payload };
    }

    boardPath(room, boardType) {
        return '/api/rooms/' + this.fixture.rooms[room].id + '/boards/' + boardType;
    }

    async close() {
        const errors = [];
        for (const context of this.contexts) {
            try { await context.close(); } catch (error) { errors.push(error); }
        }
        this.contexts.clear();
        try { if (this.browser) await this.browser.close(); } catch (error) { errors.push(error); }
        if (this.viteProcess && this.viteProcess.exitCode === null) {
            this.viteProcess.kill();
            try { await Promise.race([once(this.viteProcess, 'exit'), sleep(3000)]); } catch {}
            if (this.viteProcess.exitCode === null) this.viteProcess.kill('SIGKILL');
        }
        try { await closeSocket(this.io); } catch (error) { errors.push(error); }
        try { await closeServer(this.httpServer); } catch (error) { errors.push(error); }
        try { await closeServer(this.jwksServer); } catch (error) { errors.push(error); }
        try { await dropAndDisconnectTestDatabase(); } catch (error) { errors.push(error); }
        if (errors.length) throw new AggregateError(errors, 'Phase 9-V harness cleanup failed');
    }
}
module.exports = { Phase9VHarness, sleep };