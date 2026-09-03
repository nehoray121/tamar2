const test = require('node:test');
const assert = require('node:assert/strict');

const {
    joinOrganizationRooms
} = require('../src/socket/initializeSocket.js');
const TicketRealtimePublisher = require(
    '../src/modules/tickets/services/TicketRealtimePublisher.js'
);
const TicketTransferRealtimePublisher = require(
    '../src/modules/tickets/transfers/services/TicketTransferRealtimePublisher.js'
);
const TicketBoardRealtimePublisher = require(
    '../src/modules/tickets/boards/services/TicketBoardRealtimePublisher.js'
);
const OrganizationRealtimePublisher = require(
    '../src/services/organization/OrganizationRealtimePublisher.js'
);

const createIoRecorder = () => {
    const emissions = [];
    return {
        emissions,
        to(room) {
            return {
                emit(eventName, payload) {
                    emissions.push({
                        rooms: Array.isArray(room) ? [...room] : [room],
                        eventName,
                        payload
                    });
                }
            };
        }
    };
};

const emittedRooms = (emissions, eventName) => new Set(
    emissions
        .filter((entry) => entry.eventName === eventName)
        .flatMap((entry) => entry.rooms)
);

test('ENVIRONMENT_ADMIN socket joins its environment and every effective room', async () => {
    const joined = [];
    const socket = { join: async (room) => joined.push(room) };
    await joinOrganizationRooms(socket, {
        memberships: [{
            role: 'ENVIRONMENT_ADMIN',
            systemId: 'system-1',
            environmentId: 'environment-1'
        }],
        roomIds: ['room-1', 'room-2']
    });
    assert.deepEqual(new Set(joined), new Set([
        'environment:environment-1',
        'room:room-1',
        'room:room-2'
    ]));
});

test('SYSTEM_ADMIN and ROOM_MANAGER receive direct and descendant room events', async () => {
    const joined = [];
    const socket = { join: async (room) => joined.push(room) };
    await joinOrganizationRooms(socket, {
        memberships: [
            {
                role: 'SYSTEM_ADMIN',
                subEnvironmentId: 'sub-1'
            },
            {
                role: 'ROOM_MANAGER',
                roomId: 'room-direct'
            }
        ],
        roomIds: ['room-direct', 'room-descendant']
    });
    assert.deepEqual(new Set(joined), new Set([
        'subEnvironment:sub-1',
        'room:room-direct',
        'room:room-descendant'
    ]));
});

test('ticket workflow events invalidate all visible rooms and every management scope', () => {
    const io = createIoRecorder();
    const publisher = new TicketRealtimePublisher({ logger: null });
    publisher.setIo(io);
    publisher.publish('ticket:updated', {
        _id: 'ticket-1',
        ticketNumber: 'T-1',
        systemId: 'system-1',
        environmentId: 'environment-2',
        subEnvironmentId: 'sub-2',
        currentRoomId: 'room-2',
        visibleRoomIds: ['room-1', 'room-2'],
        status: 'OPEN',
        version: 3,
        updatedAt: new Date()
    });
    const rooms = emittedRooms(io.emissions, 'ticket:updated');
    for (const expected of [
        'system:system-1',
        'environment:environment-2',
        'subEnvironment:sub-2',
        'room:room-1',
        'room:room-2'
    ]) assert.equal(rooms.has(expected), true, expected);
});

test('transfer events reach source and destination environments, sub-environments and rooms', () => {
    const io = createIoRecorder();
    const publisher = new TicketTransferRealtimePublisher({ logger: null });
    publisher.setIo(io);
    publisher.publish('transfer:initiated', {
        _id: 'transfer-1',
        ticketId: 'ticket-1',
        ticketNumber: 'T-1',
        systemId: 'system-1',
        sourceEnvironmentId: 'environment-1',
        sourceSubEnvironmentId: 'sub-1',
        sourceRoomId: 'room-1',
        destinationEnvironmentId: 'environment-2',
        destinationSubEnvironmentId: 'sub-2',
        destinationRoomId: 'room-2',
        status: 'PENDING_ACCEPTANCE',
        initiatedAt: new Date(),
        acceptedAt: null,
        cancelledAt: null
    }, {
        status: 'OPEN',
        version: 2
    });
    const rooms = emittedRooms(io.emissions, 'transfer:initiated');
    for (const expected of [
        'system:system-1',
        'environment:environment-1',
        'environment:environment-2',
        'subEnvironment:sub-1',
        'subEnvironment:sub-2',
        'room:room-1',
        'room:room-2'
    ]) assert.equal(rooms.has(expected), true, expected);
});

test('board and hierarchy events include environment-level subscribers', () => {
    const boardIo = createIoRecorder();
    const board = new TicketBoardRealtimePublisher({ logger: null });
    board.setIo(boardIo);
    board.publishState({
        itemType: 'TICKET',
        ticketId: 'ticket-1',
        transferId: null,
        systemId: 'system-1',
        environmentId: 'environment-1',
        subEnvironmentId: 'sub-1',
        roomId: 'room-1',
        boardType: 'OPEN',
        version: 1,
        categoryId: null,
        isPinned: true,
        updatedAt: new Date()
    });
    assert.equal(
        emittedRooms(boardIo.emissions, 'board:item-state-updated')
            .has('environment:environment-1'),
        true
    );

    const organizationIo = createIoRecorder();
    const organization = new OrganizationRealtimePublisher({ logger: null });
    organization.setIo(organizationIo);
    organization.environmentCreated({
        _id: 'environment-1',
        systemId: 'system-1',
        name: 'Environment'
    });
    assert.equal(
        emittedRooms(
            organizationIo.emissions,
            'organization:environment-created'
        ).has('system:system-1'),
        true
    );
});
