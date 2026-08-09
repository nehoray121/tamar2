const test = require('node:test');
const assert = require('node:assert/strict');
const AccessFlowRealtimePublisher = require('../src/services/realtime/AccessFlowRealtimePublisher.js');
const { ROLES } = require('../src/domain/access/constants.js');

const createPublisher = () => {
    const emissions = [];
    const publisher = new AccessFlowRealtimePublisher({
        personalNumberService: { identityRoom: () => 'identity:requester' }
    });
    publisher.setIo({
        to(room) {
            return {
                emit(eventName, payload) {
                    emissions.push({ room, eventName, payload });
                }
            };
        }
    });
    return { emissions, publisher };
};

test('ROOM_USER access requests invalidate requester and every authorized reviewer scope', () => {
    const { emissions, publisher } = createPublisher();
    publisher.requestCreated({
        _id: 'request-1',
        status: 'PENDING',
        requestedRole: ROLES.ROOM_USER,
        systemId: 'system-1',
        subEnvironmentId: 'sub-1',
        roomId: 'room-1'
    }, { identity: {}, userId: 'user-1' });

    assert.deepEqual(
        new Set(emissions.map(({ room }) => room)),
        new Set(['identity:requester', 'user:user-1', 'system:system-1', 'subEnvironment:sub-1', 'room:room-1'])
    );
    assert.equal(emissions.every(({ eventName }) => eventName === 'access-request:created'), true);
});

test('SYSTEM_ADMIN requests are visible only to the requester and System reviewers', () => {
    const { emissions, publisher } = createPublisher();
    publisher.requestUpdated({
        _id: 'request-2',
        status: 'APPROVED',
        requestedRole: ROLES.SYSTEM_ADMIN,
        systemId: 'system-1',
        subEnvironmentId: 'sub-1'
    }, { identity: {} });

    assert.deepEqual(
        new Set(emissions.map(({ room }) => room)),
        new Set(['identity:requester', 'system:system-1'])
    );
});
