const test = require('node:test');
const assert = require('node:assert/strict');

const {
    joinOrganizationRooms,
    organizationRoomsForAccess,
    scheduleTokenExpiry
} = require('../src/socket/initializeSocket.js');

const AccessFlowRealtimePublisher = require(
    '../src/services/realtime/AccessFlowRealtimePublisher.js'
);
const TicketRealtimePublisher = require(
    '../src/modules/tickets/services/TicketRealtimePublisher.js'
);
const TicketAssignmentRealtimePublisher = require(
    '../src/modules/tickets/services/TicketAssignmentRealtimePublisher.js'
);
const TicketMessageRealtimePublisher = require(
    '../src/modules/tickets/messages/services/TicketMessageRealtimePublisher.js'
);
const OrganizationRealtimePublisher = require(
    '../src/services/organization/OrganizationRealtimePublisher.js'
);

const createIoRecorder = () => {
    const emissions = [];

    return {
        emissions,
        to(rooms) {
            const roomList = Array.isArray(rooms)
                ? [...rooms]
                : [rooms];

            return {
                emit(eventName, payload) {
                    emissions.push({
                        rooms: roomList,
                        eventName,
                        payload
                    });
                }
            };
        }
    };
};

test('ROOM_USER joins only its room data channel and no reviewer channel', async () => {
    const rooms = organizationRoomsForAccess({
        memberships: [{
            role: 'ROOM_USER',
            systemId: 'sys-1',
            environmentId: 'env-1',
            subEnvironmentId: 'sub-1',
            roomId: 'room-a'
        }],
        roomIds: ['room-a', 'room-b']
    });

    assert.deepEqual(
        new Set(rooms),
        new Set(['room:room-a'])
    );
    assert.equal(
        rooms.some((room) => room.includes('room-b')),
        false
    );
    assert.equal(
        rooms.some((room) => room.startsWith('reviewer:')),
        false
    );
});

test('management roles join exactly their authority data scope plus reviewer scope', async () => {
    const rooms = organizationRoomsForAccess({
        memberships: [
            {
                role: 'SUPER_ADMIN',
                systemId: 'sys-1'
            },
            {
                role: 'ENVIRONMENT_ADMIN',
                systemId: 'sys-2',
                environmentId: 'env-2'
            },
            {
                role: 'SYSTEM_ADMIN',
                systemId: 'sys-3',
                environmentId: 'env-3',
                subEnvironmentId: 'sub-3'
            },
            {
                role: 'ROOM_MANAGER',
                systemId: 'sys-4',
                environmentId: 'env-4',
                subEnvironmentId: 'sub-4',
                roomId: 'room-4'
            }
        ],
        roomIds: ['descendant-room-that-must-not-be-joined']
    });

    assert.deepEqual(
        new Set(rooms),
        new Set([
            'system:sys-1',
            'reviewer:system:sys-1',
            'environment:env-2',
            'reviewer:environment:env-2',
            'subEnvironment:sub-3',
            'reviewer:subEnvironment:sub-3',
            'room:room-4',
            'reviewer:room:room-4'
        ])
    );
});

test('joinOrganizationRooms never expands access.roomIds into socket rooms', async () => {
    const joined = [];
    const socket = {
        join: async (room) => joined.push(room)
    };

    await joinOrganizationRooms(socket, {
        memberships: [{
            role: 'ROOM_USER',
            roomId: 'room-a'
        }],
        roomIds: ['room-a', 'room-b']
    });

    assert.deepEqual(joined, ['room:room-a']);
});

test('access request reviewer traffic uses reviewer-only channels', () => {
    const io = createIoRecorder();
    const publisher = new AccessFlowRealtimePublisher({
        personalNumberService: {
            identityRoom: () => 'identity:abc'
        }
    });

    publisher.setIo(io);
    publisher.requestCreated({
        _id: 'request-1',
        status: 'PENDING',
        requestedRole: 'ROOM_USER',
        systemId: 'sys-1',
        environmentId: 'env-1',
        subEnvironmentId: 'sub-1',
        roomId: 'room-1'
    }, {
        identity: {},
        userId: 'user-1'
    });

    const reviewerEmission = io.emissions.find(
        (entry) => (
            entry.eventName === 'access-request:created'
            && entry.rooms.some(
                (room) => room.startsWith('reviewer:')
            )
        )
    );

    assert.ok(reviewerEmission);
    assert.deepEqual(
        new Set(reviewerEmission.rooms),
        new Set([
            'reviewer:system:sys-1',
            'reviewer:environment:env-1',
            'reviewer:subEnvironment:sub-1',
            'reviewer:room:room-1'
        ])
    );
});

test('permissions update is targeted to changed user and management invalidation is reviewer-only', () => {
    const io = createIoRecorder();
    const publisher = new AccessFlowRealtimePublisher({
        personalNumberService: {
            identityRoom: () => 'identity:abc'
        }
    });

    publisher.setIo(io);
    publisher.userPermissionsUpdated({
        id: 'user-1',
        updatedAt: new Date().toISOString(),
        memberships: [{
            role: 'ROOM_USER',
            systemId: 'sys-1',
            environmentId: 'env-1',
            subEnvironmentId: 'sub-1',
            roomId: 'room-1'
        }]
    });

    const permissions = io.emissions.find(
        (entry) => entry.eventName === 'permissions:updated'
    );
    const management = io.emissions.find(
        (entry) => entry.eventName === 'user-management:updated'
    );

    assert.deepEqual(permissions.rooms, ['user:user-1']);
    assert.equal(
        management.rooms.every(
            (room) => room.startsWith('reviewer:')
        ),
        true
    );
});

test('ticket publisher uses one union broadcast and retains room invalidation metadata', () => {
    const io = createIoRecorder();
    const publisher = new TicketRealtimePublisher({
        logger: null
    });
    publisher.setIo(io);

    publisher.publish('ticket:updated', {
        _id: 'ticket-1',
        ticketNumber: 'T-1',
        systemId: 'sys-1',
        environmentId: 'env-1',
        subEnvironmentId: 'sub-1',
        currentRoomId: 'room-b',
        visibleRoomIds: ['room-a', 'room-b'],
        status: 'OPEN',
        version: 4,
        updatedAt: new Date()
    });

    const event = io.emissions.find(
        (entry) => entry.eventName === 'ticket:updated'
    );

    assert.ok(event);
    assert.deepEqual(
        new Set(event.rooms),
        new Set([
            'system:sys-1',
            'environment:env-1',
            'subEnvironment:sub-1',
            'room:room-a',
            'room:room-b'
        ])
    );
    assert.equal(
        io.emissions.filter(
            (entry) => entry.eventName === 'ticket:updated'
        ).length,
        1
    );
});

test('environment admin receives assignment channel through environment publication', () => {
    const io = createIoRecorder();
    const publisher = new TicketAssignmentRealtimePublisher({
        logger: null
    });
    publisher.setIo(io);

    publisher.publish({
        ticket: {
            _id: 'ticket-1',
            ticketNumber: 'T-1',
            systemId: 'sys-1',
            environmentId: 'env-1',
            subEnvironmentId: 'sub-1',
            currentRoomId: 'room-1',
            version: 2,
            activeAssigneeIds: [],
            updatedAt: new Date()
        },
        addedIds: [],
        removedIds: ['user-1']
    });

    const event = io.emissions.find(
        (entry) => entry.eventName === 'assignment:updated'
    );

    assert.equal(
        event.rooms.includes('environment:env-1'),
        true
    );
});

test('chat publisher includes environment channel for visible room lineages', async () => {
    const io = createIoRecorder();
    const publisher = new TicketMessageRealtimePublisher({
        logger: null,
        organization: {
            integrityService: {
                resolveRoom: async (roomId) => ({
                    system: { _id: 'sys-1' },
                    environment: { _id: 'env-1' },
                    subEnvironment: { _id: 'sub-1' },
                    room: { _id: roomId }
                })
            }
        }
    });

    publisher.setIo(io);

    await publisher.publish(
        'chat:message-created',
        {
            ticketId: 'ticket-1',
            _id: 'message-1',
            systemId: 'sys-1',
            authorUserId: 'user-1',
            version: 1,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            systemId: 'sys-1',
            currentRoomId: 'room-1',
            visibleRoomIds: ['room-1']
        }
    );

    const event = io.emissions.find(
        (entry) => entry.eventName === 'chat:message-created'
    );

    assert.equal(
        event.rooms.includes('environment:env-1'),
        true
    );
});

test('settings organization publication is emitted once to a union of scope rooms', () => {
    const io = createIoRecorder();
    const publisher = new OrganizationRealtimePublisher({
        logger: null
    });

    publisher.setIo(io);
    publisher.settingsUpdated({
        _id: 'setting-1',
        systemId: 'sys-1',
        environmentId: 'env-1',
        subEnvironmentId: 'sub-1',
        roomId: 'room-1',
        version: 7,
        updatedAt: new Date()
    });

    const events = io.emissions.filter(
        (entry) => entry.eventName === 'settings:updated'
    );

    assert.equal(events.length, 1);
    assert.deepEqual(
        new Set(events[0].rooms),
        new Set([
            'system:sys-1',
            'environment:env-1',
            'subEnvironment:sub-1',
            'room:room-1'
        ])
    );
});

test('token expiry emits auth event before server disconnect', async () => {
    const emitted = [];
    let disconnected = false;

    const socket = {
        data: {},
        emit(eventName, payload) {
            emitted.push({ eventName, payload });
        },
        disconnect(force) {
            disconnected = force === true;
        }
    };

    scheduleTokenExpiry(
        socket,
        new Date(Date.now() - 1000),
        0
    );

    await new Promise(
        (resolve) => setTimeout(resolve, 45)
    );

    assert.equal(
        emitted[0]?.eventName,
        'auth:token-expired'
    );
    assert.equal(disconnected, true);
});
