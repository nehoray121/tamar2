const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const { after, before, beforeEach, test } = require('node:test');
const { io: createSocketClient } = require('socket.io-client');
const User = require('../src/models/User.js');
const createApp = require('../src/app.js');
const { ROLES } = require('../src/domain/access/constants.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { closeSocket, initializeSocket } = require('../src/socket/initializeSocket.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const {
    addMembership, createPhase7aFixture, createUser
} = require('./helpers/phase7aFixture.js');
const {
    createTestConfig, createVerifier, initializeAuthKeys, signToken
} = require('./helpers/authFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let config;
let services;
let httpServer;
let io;
let baseUrl;
let identityCounter = 0;
const openSockets = new Set();
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const connect = (accessToken) => new Promise((resolve, reject) => {
    const socket = createSocketClient(baseUrl, {
        transports: ['websocket'],
        auth: { accessToken },
        reconnection: false,
        timeout: 2500,
        extraHeaders: { Origin: 'http://localhost:5173' }
    });
    socket.once('connect', () => {
        openSockets.add(socket);
        resolve(socket);
    });
    socket.once('connect_error', reject);
});
const nextEvent = (socket, eventName) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${eventName} was not received`)), 2500);
    socket.once(eventName, (payload) => {
        clearTimeout(timeout);
        resolve(payload);
    });
});
const provision = async (user) => {
    identityCounter += 1;
    const subject = `phase7v-socket-${identityCounter}`;
    const personalNumber = `9${String(identityCounter).padStart(6, '0')}`;
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    await User.updateOne({ _id: user._id }, { $set: {
        externalIdentity: { provider: config.auth.providerKey, subject },
        personalNumberLookupHash: protectedNumber.lookupHash,
        personalNumberLast4: protectedNumber.last4
    } });
    return signToken({
        subject, personalNumber, displayName: user.displayName, email: user.email
    });
};
const createOtherSystemSuperAdmin = async () => {
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: 'P7VSOCKET', name: 'Other Socket System' });
    const environment = await management.createEnvironment({
        systemId: system._id, key: 'p7v-socket-env', name: 'Other Socket Environment'
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id,
        environmentId: environment._id,
        key: 'p7v-socket-sub',
        name: 'Other Socket Sub Environment'
    });
    const room = await management.createRoom({
        systemId: system._id,
        environmentId: environment._id,
        subEnvironmentId: subEnvironment._id,
        key: 'p7v-socket-room',
        name: 'Other Socket Room'
    });
    const actor = await createUser(services, 'Other Socket Super Admin');
    await addMembership(services, actor, ROLES.SUPER_ADMIN, {
        system, environment, subEnvironment, room
    });
    return actor;
};

before(async () => {
    await initializeAuthKeys();
    await connectTestDatabase();
    config = createTestConfig();
    services = createServiceContainer({ config, logger });
    services.auth.accessTokenVerifier = createVerifier(config.auth);
    httpServer = createServer(createApp({ config, logger, services }));
    io = initializeSocket({ httpServer, config, logger, services });
    services.tickets.messageRealtimePublisher.setIo(io);
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});
beforeEach(async () => {
    for (const socket of openSockets) socket.close();
    openSockets.clear();
    await clearTestCollections();
});
after(async () => {
    for (const socket of openSockets) socket.close();
    await closeSocket(io);
    if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve));
    await dropAndDisconnectTestDatabase();
});

test('authorized Socket.IO clients receive isolated content-free chat invalidation events', async () => {
    const data = await createPhase7aFixture(services, 'v-realtime-routing');
    const otherSystemActor = await createOtherSystemSuperAdmin();
    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Pending realtime routing' }
    );
    assert.ok(initiated.transfer.id);

    const [source, destination, subEnvironment, system, unrelated] = await Promise.all([
        connect(await provision(data.users.sourceUser)),
        connect(await provision(data.users.destinationUser)),
        connect(await provision(data.users.systemAdmin)),
        connect(await provision(data.users.superAdmin)),
        connect(await provision(otherSystemActor))
    ]);
    const unrelatedEvents = [];
    unrelated.on('chat:message-created', (payload) => unrelatedEvents.push(payload));
    const expected = [source, destination, subEnvironment, system]
        .map((socket) => nextEvent(socket, 'chat:message-created'));
    const clientMessageId = randomUUID();
    const created = await services.tickets.messageService.create(
        data.users.sourceUser._id,
        data.ticket.id,
        { clientMessageId, content: 'content must stay in REST only' }
    );
    const payloads = await Promise.all(expected);
    await wait(100);
    assert.equal(unrelatedEvents.length, 0);
    for (const payload of payloads) {
        assert.equal(payload.ticketId, data.ticket.id);
        assert.equal(payload.messageId, created.message.id);
        const serialized = JSON.stringify(payload);
        for (const forbidden of [
            'content must stay in REST only', 'content', 'email', 'externalIdentity',
            'personalNumber', 'claims', clientMessageId
        ]) assert.equal(serialized.includes(forbidden), false, forbidden);
    }
});

test('idempotent replay and failed mutations emit no duplicate realtime event', async () => {
    const data = await createPhase7aFixture(services, 'v-realtime-replay');
    const source = await connect(await provision(data.users.sourceUser));
    const destination = await connect(await provision(data.users.destinationUser));
    const events = [];
    source.on('chat:message-created', (payload) => events.push(payload));
    destination.on('chat:message-updated', (payload) => events.push(payload));
    const clientMessageId = randomUUID();
    const first = await services.tickets.messageService.create(
        data.users.sourceUser._id,
        data.ticket.id,
        { clientMessageId, content: 'replay once' }
    );
    await wait(75);
    const replay = await services.tickets.messageService.create(
        data.users.sourceUser._id,
        data.ticket.id,
        { clientMessageId, content: 'replay once' }
    );
    assert.equal(replay.replayed, true);
    await assert.rejects(
        services.tickets.messageService.edit(
            data.users.destinationUser._id,
            data.ticket.id,
            first.message.id,
            1,
            'forbidden mutation'
        ),
        (error) => error.code === 'TICKET_NOT_FOUND'
            || error.code === 'MESSAGE_NOT_AUTHORED_BY_ACTOR'
    );
    await wait(125);
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, 'chat:message-created');
});

test('Socket transport exposes no Message write or generic join handler', () => {
    const source = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '../src/socket/initializeSocket.js'), 'utf8'
    );
    assert.doesNotMatch(source, /socket\.on\(['"](?:chat:|message:|join)/);
    assert.doesNotMatch(source, /content|clientMessageId|messageService\.(?:create|edit|delete)/);
});
