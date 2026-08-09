const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const Environment = require('../src/models/Environment.js');
const OrganizationMembership = require('../src/models/OrganizationMembership.js');
const Room = require('../src/models/Room.js');
const SubEnvironment = require('../src/models/SubEnvironment.js');
const System = require('../src/models/System.js');
const User = require('../src/models/User.js');
const { ROLES } = require('../src/domain/access/constants.js');
const createServiceContainer = require('../src/services/createServiceContainer.js');
const {
    clearTestCollections, connectTestDatabase, dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');
const {
    addMembership, createPhase7aFixture, createUser
} = require('./helpers/phase7aFixture.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
let services;

const list = (actor, data) => services.tickets.messageQueryService.list(
    actor._id, data.ticket.id, { limit: 10, before: null }
);
const assertAllowed = async (actor, data) => {
    const result = await list(actor, data);
    assert.deepEqual(result.items, []);
};
const assertDenied = (actor, data) => assert.rejects(
    list(actor, data), (error) => error.code === 'TICKET_NOT_FOUND'
);
const graph = (data, room = data.rooms.a) => ({
    system: data.system,
    environment: data.environment,
    subEnvironment: data.subEnvironment,
    room
});
const acceptTransferToB = async (data) => {
    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Phase 7A-V authorization transfer' }
    );
    await services.tickets.transferService.accept(
        data.users.destinationManager._id, initiated.transfer.id, 2
    );
};
const createSiblingRoom = async (data, suffix) => {
    const subEnvironment = await services.organization.managementService.createSubEnvironment({
        systemId: data.system._id,
        environmentId: data.environment._id,
        key: `p7v-sibling-${suffix}`,
        name: `Sibling ${suffix}`
    });
    const room = await services.organization.managementService.createRoom({
        systemId: data.system._id,
        environmentId: data.environment._id,
        subEnvironmentId: subEnvironment._id,
        key: `p7v-sibling-room-${suffix}`,
        name: `Sibling Room ${suffix}`
    });
    return { system: data.system, environment: data.environment, subEnvironment, room };
};
const createOtherSystemRoom = async (suffix) => {
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `P7V${suffix}`, name: `Other ${suffix}` });
    const environment = await management.createEnvironment({
        systemId: system._id, key: `p7v-other-env-${suffix}`, name: 'Other Environment'
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id,
        environmentId: environment._id,
        key: `p7v-other-sub-${suffix}`,
        name: 'Other Sub Environment'
    });
    const room = await management.createRoom({
        systemId: system._id,
        environmentId: environment._id,
        subEnvironmentId: subEnvironment._id,
        key: `p7v-other-room-${suffix}`,
        name: 'Other Room'
    });
    return { system, environment, subEnvironment, room };
};

before(async () => {
    await connectTestDatabase();
    services = createServiceContainer({ logger });
});
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('current ROOM_USER has Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-current-user');
    await assertAllowed(data.users.sourceUser, data);
});

test('current ROOM_MANAGER has Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-current-manager');
    await assertAllowed(data.users.sourceManager, data);
});

test('parent SYSTEM_ADMIN has Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-current-admin');
    await assertAllowed(data.users.systemAdmin, data);
});

test('assigned-System SUPER_ADMIN has Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-current-super');
    await assertAllowed(data.users.superAdmin, data);
});

test('membership in an unrelated Room does not grant Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-unrelated-room');
    const room = await services.organization.managementService.createRoom({
        systemId: data.system._id,
        environmentId: data.environment._id,
        subEnvironmentId: data.subEnvironment._id,
        key: 'p7v-unrelated-room',
        name: 'Unrelated Room'
    });
    const actor = await createUser(services, 'Unrelated Room User');
    await addMembership(services, actor, ROLES.ROOM_USER, graph(data, room));
    await assertDenied(actor, data);
});

test('membership in a sibling SubEnvironment does not grant Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-sibling');
    const sibling = await createSiblingRoom(data, 'deny');
    const actor = await createUser(services, 'Sibling System Admin');
    await addMembership(services, actor, ROLES.SYSTEM_ADMIN, sibling);
    await assertDenied(actor, data);
});

test('membership in another System does not grant Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-other-system');
    const other = await createOtherSystemRoom('DENY');
    const actor = await createUser(services, 'Other System Super Admin');
    await addMembership(services, actor, ROLES.SUPER_ADMIN, other);
    await assertDenied(actor, data);
});

test('inactive User loses Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-inactive-user');
    await User.updateOne({ _id: data.users.sourceUser._id }, { $set: { isActive: false } });
    await assertDenied(data.users.sourceUser, data);
});

test('revoked membership removes Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-revoked');
    await OrganizationMembership.updateMany(
        { userId: data.users.sourceUser._id }, { $set: { isActive: false } }
    );
    await assertDenied(data.users.sourceUser, data);
});

test('inactive Room removes Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-inactive-room');
    await Room.updateOne({ _id: data.rooms.a._id }, { $set: { isActive: false } });
    await assertDenied(data.users.sourceUser, data);
});

test('archived Room removes Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-archived-room');
    await Room.updateOne({ _id: data.rooms.a._id }, {
        $set: { isActive: false, archivedAt: new Date() }
    });
    await assertDenied(data.users.sourceUser, data);
});

test('inactive SubEnvironment removes Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-inactive-sub');
    await SubEnvironment.updateOne(
        { _id: data.subEnvironment._id }, { $set: { isActive: false } }
    );
    await assertDenied(data.users.sourceUser, data);
});

test('inactive Environment removes Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-inactive-env');
    await Environment.updateOne(
        { _id: data.environment._id }, { $set: { isActive: false } }
    );
    await assertDenied(data.users.sourceUser, data);
});

test('inactive System removes Ticket chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-inactive-system');
    await System.updateOne({ _id: data.system._id }, { $set: { isActive: false } });
    await assertDenied(data.users.sourceUser, data);
});

test('Ticket creator status alone does not grant chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-creator-only');
    await OrganizationMembership.updateMany(
        { userId: data.users.sourceManager._id }, { $set: { isActive: false } }
    );
    await assertDenied(data.users.sourceManager, data);
});

test('Ticket assignment alone does not grant chat access', async () => {
    const data = await createPhase7aFixture(services, 'v-assignee-only');
    await services.tickets.assignmentService.replace(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        [String(data.users.sourceUser._id)]
    );
    await OrganizationMembership.updateMany(
        { userId: data.users.sourceUser._id }, { $set: { isActive: false } }
    );
    await assertDenied(data.users.sourceUser, data);
});

test('previous visible ROOM_USER retains chat access after transfer', async () => {
    const data = await createPhase7aFixture(services, 'v-previous-user');
    await acceptTransferToB(data);
    await assertAllowed(data.users.sourceUser, data);
});

test('previous visible ROOM_MANAGER retains chat access after transfer', async () => {
    const data = await createPhase7aFixture(services, 'v-previous-manager');
    await acceptTransferToB(data);
    await assertAllowed(data.users.sourceManager, data);
});

test('previous visible SYSTEM_ADMIN retains chat access across SubEnvironments', async () => {
    const data = await createPhase7aFixture(services, 'v-previous-admin');
    const sibling = await createSiblingRoom(data, 'previous');
    const destinationManager = await createUser(services, 'Sibling Destination Manager');
    await addMembership(services, destinationManager, ROLES.ROOM_MANAGER, sibling);
    const initiated = await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: sibling.room._id, reason: 'Cross SubEnvironment verification' }
    );
    await services.tickets.transferService.accept(destinationManager._id, initiated.transfer.id, 2);
    await assertAllowed(data.users.systemAdmin, data);
});

test('previous Room access is lost after membership revocation', async () => {
    const data = await createPhase7aFixture(services, 'v-previous-revoked');
    await acceptTransferToB(data);
    await OrganizationMembership.updateMany(
        { userId: data.users.sourceUser._id }, { $set: { isActive: false } }
    );
    await assertDenied(data.users.sourceUser, data);
});

test('Room absent from visibleRoomIds cannot participate in chat', async () => {
    const data = await createPhase7aFixture(services, 'v-not-visible');
    await assertDenied(data.users.thirdManager, data);
});

test('pending transfer source Room may participate in chat', async () => {
    const data = await createPhase7aFixture(services, 'v-pending-source');
    await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Pending source verification' }
    );
    await assertAllowed(data.users.sourceUser, data);
});

test('pending transfer destination Room may participate in chat', async () => {
    const data = await createPhase7aFixture(services, 'v-pending-destination');
    await services.tickets.transferService.initiate(
        data.users.sourceManager._id,
        data.ticket.id,
        1,
        { destinationRoomId: data.rooms.b._id, reason: 'Pending destination verification' }
    );
    await assertAllowed(data.users.destinationUser, data);
});
