const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const { ROLE_VALUES } = require('../src/domain/access/constants.js');
const { ORGANIZATION_ENTITY_TYPES } = require('../src/domain/organization/constants.js');
const Environment = require('../src/models/Environment.js');
const Room = require('../src/models/Room.js');
const SubEnvironment = require('../src/models/SubEnvironment.js');
const System = require('../src/models/System.js');
const createOrganizationServices = require('../src/services/organization/createOrganizationServices.js');
const {
    clearTestCollections,
    connectTestDatabase,
    dropAndDisconnectTestDatabase
} = require('./helpers/testDatabase.js');

const actorId = () => new mongoose.Types.ObjectId();

const assertCode = async (operation, code) => {
    await assert.rejects(operation, (error) => {
        assert.equal(error.code, code);
        return true;
    });
};

const createHierarchy = async (suffix = '') => {
    const services = createOrganizationServices();
    const system = await services.managementService.createSystem({ key: `system${suffix || '-a'}`, name: 'System A' });
    const environment = await services.managementService.createEnvironment({
        systemId: system._id, key: `environment${suffix || '-a'}`, name: 'Environment A'
    });
    const subEnvironment = await services.managementService.createSubEnvironment({
        systemId: system._id,
        environmentId: environment._id,
        key: `sub${suffix || '-a'}`,
        name: 'SubEnvironment A'
    });
    const room = await services.managementService.createRoom({
        systemId: system._id,
        environmentId: environment._id,
        subEnvironmentId: subEnvironment._id,
        key: `room${suffix || '-a'}`,
        name: 'Room A'
    });
    return { services, system, environment, subEnvironment, room };
};

before(connectTestDatabase);
beforeEach(clearTestCollections);
after(dropAndDisconnectTestDatabase);

test('System key is normalized and unique', async () => {
    const { managementService } = createOrganizationServices();
    const system = await managementService.createSystem({ key: ' Main System ', name: ' Main System ' });
    assert.equal(system.key, 'main-system');
    assert.equal(system.name, 'Main System');
    await assertCode(
        () => managementService.createSystem({ key: 'main-system', name: 'Duplicate' }),
        'DUPLICATE_SYSTEM_KEY'
    );
});

test('Environment key is unique only within its System', async () => {
    const { managementService } = createOrganizationServices();
    const firstSystem = await managementService.createSystem({ key: 'first-system', name: 'First' });
    const secondSystem = await managementService.createSystem({ key: 'second-system', name: 'Second' });
    await managementService.createEnvironment({ systemId: firstSystem._id, key: 'prod', name: 'Prod A' });
    await assertCode(
        () => managementService.createEnvironment({ systemId: firstSystem._id, key: 'prod', name: 'Duplicate' }),
        'DUPLICATE_ENVIRONMENT_KEY'
    );
    const sameKeyElsewhere = await managementService.createEnvironment({
        systemId: secondSystem._id, key: 'prod', name: 'Prod B'
    });
    assert.equal(sameKeyElsewhere.key, 'prod');
});

test('SubEnvironment key is unique within its Environment', async () => {
    const { services, system, environment } = await createHierarchy();
    await assertCode(
        () => services.managementService.createSubEnvironment({
            systemId: system._id, environmentId: environment._id, key: 'sub-a', name: 'Duplicate'
        }),
        'DUPLICATE_SUB_ENVIRONMENT_KEY'
    );
});

test('Room key is unique within its SubEnvironment', async () => {
    const { services, system, environment, subEnvironment } = await createHierarchy();
    await assertCode(
        () => services.managementService.createRoom({
            systemId: system._id,
            environmentId: environment._id,
            subEnvironmentId: subEnvironment._id,
            key: 'room-a',
            name: 'Duplicate'
        }),
        'DUPLICATE_ROOM_KEY'
    );
});

test('Organization models do not define deprecated or canonical role fields', () => {
    assert.deepEqual(ROLE_VALUES, ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ROOM_MANAGER', 'ROOM_USER']);
    for (const model of [System, Environment, SubEnvironment, Room]) {
        assert.equal(model.schema.path('role'), undefined);
    }
});

test('Environment creation requires an existing System', async () => {
    const { managementService } = createOrganizationServices();
    await assertCode(
        () => managementService.createEnvironment({
            systemId: new mongoose.Types.ObjectId(), key: 'orphan', name: 'Orphan'
        }),
        'SYSTEM_NOT_FOUND'
    );
});

test('SubEnvironment creation requires an existing Environment', async () => {
    const { managementService } = createOrganizationServices();
    const system = await managementService.createSystem({ key: 'system-x', name: 'System' });
    await assertCode(
        () => managementService.createSubEnvironment({
            systemId: system._id,
            environmentId: new mongoose.Types.ObjectId(),
            key: 'orphan-sub',
            name: 'Orphan'
        }),
        'ENVIRONMENT_NOT_FOUND'
    );
});

test('SubEnvironment systemId must match its Environment', async () => {
    const { managementService } = createOrganizationServices();
    const first = await managementService.createSystem({ key: 'system-one', name: 'One' });
    const second = await managementService.createSystem({ key: 'system-two', name: 'Two' });
    const environment = await managementService.createEnvironment({ systemId: first._id, key: 'env', name: 'Env' });
    await assertCode(
        () => managementService.createSubEnvironment({
            systemId: second._id, environmentId: environment._id, key: 'bad-sub', name: 'Bad'
        }),
        'INCONSISTENT_ORGANIZATION_LINEAGE'
    );
});

test('Room creation requires an existing SubEnvironment', async () => {
    const { services, system, environment } = await createHierarchy();
    await assertCode(
        () => services.managementService.createRoom({
            systemId: system._id,
            environmentId: environment._id,
            subEnvironmentId: new mongoose.Types.ObjectId(),
            key: 'orphan-room',
            name: 'Orphan'
        }),
        'SUB_ENVIRONMENT_NOT_FOUND'
    );
});

test('Room lineage rejects another Environment or System', async () => {
    const first = await createHierarchy('-one');
    const second = await createHierarchy('-two');
    await assertCode(
        () => first.services.managementService.createRoom({
            systemId: first.system._id,
            environmentId: second.environment._id,
            subEnvironmentId: first.subEnvironment._id,
            key: 'bad-environment',
            name: 'Bad'
        }),
        'INCONSISTENT_ORGANIZATION_LINEAGE'
    );
    await assertCode(
        () => first.services.managementService.createRoom({
            systemId: second.system._id,
            environmentId: first.environment._id,
            subEnvironmentId: first.subEnvironment._id,
            key: 'bad-system',
            name: 'Bad'
        }),
        'INCONSISTENT_ORGANIZATION_LINEAGE'
    );
});

test('Complete Room lineage resolves to canonical ObjectIds', async () => {
    const { services, system, environment, subEnvironment, room } = await createHierarchy();
    const lineage = await services.hierarchyService.resolveLineage(ORGANIZATION_ENTITY_TYPES.ROOM, room._id);
    assert.equal(String(lineage.system._id), String(system._id));
    assert.equal(String(lineage.environment._id), String(environment._id));
    assert.equal(String(lineage.subEnvironment._id), String(subEnvironment._id));
    assert.equal(String(lineage.room._id), String(room._id));
});

test('Active child cannot be created under an inactive parent', async () => {
    const { managementService, lifecycleService } = createOrganizationServices();
    const system = await managementService.createSystem({ key: 'inactive-system', name: 'Inactive' });
    await lifecycleService.deactivateEntity(ORGANIZATION_ENTITY_TYPES.SYSTEM, system._id, actorId());
    await assertCode(
        () => managementService.createEnvironment({ systemId: system._id, key: 'blocked', name: 'Blocked' }),
        'INACTIVE_PARENT'
    );
});

test('Archived parent cannot receive a new child', async () => {
    const { managementService, lifecycleService } = createOrganizationServices();
    const system = await managementService.createSystem({ key: 'archived-system', name: 'Archived' });
    await lifecycleService.archiveEntity(ORGANIZATION_ENTITY_TYPES.SYSTEM, system._id, actorId());
    await assertCode(
        () => managementService.createEnvironment({ systemId: system._id, key: 'blocked', name: 'Blocked' }),
        'ARCHIVED_PARENT'
    );
});

test('Parent with active children cannot be archived', async () => {
    const { services, system } = await createHierarchy();
    await assertCode(
        () => services.lifecycleService.archiveEntity(ORGANIZATION_ENTITY_TYPES.SYSTEM, system._id, actorId()),
        'ACTIVE_CHILDREN_EXIST'
    );
});

test('Archive is soft and preserves the document', async () => {
    const { services, room } = await createHierarchy();
    await services.lifecycleService.archiveEntity(ORGANIZATION_ENTITY_TYPES.ROOM, room._id, actorId());
    const stored = await services.roomRepository.findById(room._id);
    assert.ok(stored);
    assert.equal(stored.isActive, false);
    assert.ok(stored.archivedAt);
});

test('Reactivation requires a valid active parent chain', async () => {
    const { services, environment, room } = await createHierarchy();
    await services.lifecycleService.deactivateEntity(ORGANIZATION_ENTITY_TYPES.ROOM, room._id, actorId());
    await services.lifecycleService.deactivateEntity(ORGANIZATION_ENTITY_TYPES.ENVIRONMENT, environment._id, actorId());
    await assertCode(
        () => services.lifecycleService.reactivateEntity(ORGANIZATION_ENTITY_TYPES.ROOM, room._id, actorId()),
        'ORGANIZATION_SCOPE_INACTIVE'
    );
    await services.lifecycleService.reactivateEntity(ORGANIZATION_ENTITY_TYPES.ENVIRONMENT, environment._id, actorId());
    const reactivated = await services.lifecycleService.reactivateEntity(
        ORGANIZATION_ENTITY_TYPES.ROOM, room._id, actorId()
    );
    assert.equal(reactivated.isActive, true);
});
