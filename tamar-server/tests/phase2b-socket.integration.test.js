const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { after, before, beforeEach, test } = require('node:test');
const { io: createSocketClient } = require('socket.io-client');
const createApp = require('../src/app.js');
const { ROLES, SCOPE_TYPES } = require('../src/domain/access/constants.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const { closeSocket, initializeSocket } = require('../src/socket/initializeSocket.js');
const { clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase } = require('./helpers/testDatabase.js');
const { createTestConfig, createVerifier, initializeAuthKeys, signToken } = require('./helpers/authFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let config;
let services;
let httpServer;
let io;
let baseUrl;
const connect = (auth) => new Promise((resolve) => {
    const socket = createSocketClient(baseUrl, { transports: ['websocket'], auth, reconnection: false, timeout: 2500, extraHeaders: { Origin: 'http://localhost:5173' } });
    socket.once('connect', () => resolve({ socket }));
    socket.once('connect_error', (error) => resolve({ socket, error }));
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const authIdentity = ({ subject, personalNumber }) => {
    const protectedNumber = services.auth.personalNumberService.protect(personalNumber);
    return { provider: config.auth.providerKey, subject, personalNumberLookupHash: protectedNumber.lookupHash, personalNumberLast4: protectedNumber.last4, displayName: `User ${subject}`, email: `${subject}@example.com` };
};
const createUser = async ({ subject, personalNumber }) => {
    const identity = authIdentity({ subject, personalNumber });
    return services.userRepository.create({ externalIdentity: { provider: identity.provider, subject }, personalNumberLookupHash: identity.personalNumberLookupHash, personalNumberLast4: identity.personalNumberLast4, displayName: identity.displayName, email: identity.email, isActive: true });
};

before(async () => {
    await initializeAuthKeys();
    await connectTestDatabase();
    config = createTestConfig();
    services = createServiceContainer({ config, logger });
    services.auth.accessTokenVerifier = createVerifier(config.auth);
    httpServer = createServer(createApp({ config, logger, services }));
    io = initializeSocket({ httpServer, config, logger, services });
    services.realtimePublisher.setIo(io);
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});
beforeEach(clearTestCollections);
after(async () => {
    await closeSocket(io);
    if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve));
    await dropAndDisconnectTestDatabase();
});

test('Socket.IO accepts a valid signed Access Token', async () => {
    const token = await signToken({ subject: 'socket-valid', personalNumber: '6000001' });
    const { socket, error } = await connect({ accessToken: token });
    assert.equal(error, undefined);
    assert.equal(socket.connected, true);
    socket.disconnect();
});
test('Socket.IO rejects a missing Access Token', async () => {
    const { socket, error } = await connect({});
    assert.ok(error);
    assert.equal(socket.connected, false);
    socket.close();
});
test('Socket.IO rejects an invalid Access Token', async () => {
    const { socket, error } = await connect({ accessToken: 'invalid.token.value' });
    assert.ok(error);
    socket.close();
});
test('Socket.IO rejects personal number without token', async () => {
    const { socket, error } = await connect({ personalNumber: '6000002' });
    assert.ok(error);
    socket.close();
});
test('Socket token role claim does not create Tamar authorization', async () => {
    const token = await signToken({ subject: 'socket-role', personalNumber: '6000003', extraClaims: { role: 'SUPER_ADMIN' } });
    const { socket } = await connect({ accessToken: token });
    const serverSocket = io.sockets.sockets.get(socket.id);
    assert.equal('role' in serverSocket.data.auth, false);
    assert.equal(serverSocket.data.userId, undefined);
    socket.disconnect();
});
test('Socket joins a deterministic safe identity room without raw identity', async () => {
    const token = await signToken({ subject: 'socket-room-subject', personalNumber: '6000004' });
    const { socket } = await connect({ accessToken: token });
    const rooms = [...io.sockets.sockets.get(socket.id).rooms];
    assert.ok(rooms.some((room) => room.startsWith('identity:')));
    assert.equal(rooms.some((room) => room.includes('socket-room-subject') || room.includes('6000004')), false);
    socket.disconnect();
});
test('Socket joins user room only for a matched active User', async () => {
    const user = await createUser({ subject: 'socket-user', personalNumber: '6000005' });
    const token = await signToken({ subject: 'socket-user', personalNumber: '6000005' });
    const { socket } = await connect({ accessToken: token });
    const rooms = io.sockets.sockets.get(socket.id).rooms;
    assert.equal(rooms.has(`user:${user._id}`), true);
    socket.disconnect();
});
test('client cannot join an arbitrary Socket.IO room', async () => {
    const token = await signToken({ subject: 'socket-no-join', personalNumber: '6000006' });
    const { socket } = await connect({ accessToken: token });
    socket.emit('join-room', 'admin:anywhere');
    await wait(50);
    assert.equal(io.sockets.sockets.get(socket.id).rooms.has('admin:anywhere'), false);
    socket.disconnect();
});
test('Socket disconnects when its Access Token expires', async () => {
    const token = await signToken({ subject: 'socket-expiry', personalNumber: '6000007', expiresIn: Math.floor(Date.now() / 1000) + 1 });
    const { socket } = await connect({ accessToken: token });
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Socket did not disconnect at token expiration')), 2500);
        socket.once('disconnect', () => { clearTimeout(timeout); resolve(); });
    });
    assert.equal(socket.connected, false);
});
test('Socket data never stores the raw Access Token', async () => {
    const token = await signToken({ subject: 'socket-privacy', personalNumber: '6000008' });
    const { socket } = await connect({ accessToken: token });
    const data = io.sockets.sockets.get(socket.id).data;
    assert.equal('accessToken' in data, false);
    assert.equal(JSON.stringify({ auth: data.auth, userId: data.userId }).includes(token), false);
    socket.disconnect();
});
test('requester identity room receives access-request status events', async () => {
    const token = await signToken({ subject: 'socket-events', personalNumber: '6000009' });
    const { socket } = await connect({ accessToken: token });
    const event = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Access Request event not received')), 2000);
        socket.once('access-request:created', (payload) => { clearTimeout(timeout); resolve(payload); });
    });
    services.realtimePublisher.requestCreated({ _id: 'event-request', status: 'PENDING' }, { identity: authIdentity({ subject: 'socket-events', personalNumber: '6000009' }) });
    const payload = await event;
    assert.equal(payload.status, 'PENDING');
    socket.disconnect();
});
test('permissions updated event contains no protected identity data', async () => {
    const token = await signToken({ subject: 'socket-permissions', personalNumber: '6000010' });
    const { socket } = await connect({ accessToken: token });
    const event = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('permissions:updated not received')), 2000);
        socket.once('permissions:updated', (payload) => { clearTimeout(timeout); resolve(payload); });
    });
    services.realtimePublisher.permissionsUpdated({ _id: 'approved-request' }, { identity: authIdentity({ subject: 'socket-permissions', personalNumber: '6000010' }) });
    const payload = await event;
    assert.deepEqual(payload, { accessRequestId: 'approved-request' });
    socket.disconnect();
});
