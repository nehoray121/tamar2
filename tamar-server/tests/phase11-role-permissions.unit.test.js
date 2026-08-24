const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ROLES,
    ROLE_SCOPE_TYPES,
    SCOPE_TYPES
} = require('../src/domain/access/constants.js');
const {
    assertRoleScopeCompatibility
} = require('../src/domain/access/validators.js');
const OrganizationHierarchyAuthorizationService = require(
    '../src/services/authorization/OrganizationHierarchyAuthorizationService.js'
);
const TicketAuthorizationService = require(
    '../src/modules/tickets/services/TicketAuthorizationService.js'
);
const SettingsService = require(
    '../src/services/settings/SettingsService.js'
);
const TicketBoardAuthorizationService = require(
    '../src/modules/tickets/boards/services/TicketBoardAuthorizationService.js'
);

const IDS = {
    system: '000000000000000000000001',
    environment: '000000000000000000000002',
    subEnvironment: '000000000000000000000003',
    room: '000000000000000000000004',
    otherRoom: '000000000000000000000005'
};

const lineage = {
    system: { _id: IDS.system },
    environment: { _id: IDS.environment },
    subEnvironment: { _id: IDS.subEnvironment },
    room: { _id: IDS.room }
};

const accessFor = (role, overrides = {}) => ({
    isActive: true,
    global: role === ROLES.SUPER_ADMIN,
    systemIds: [IDS.system],
    environmentIds: [IDS.environment],
    subEnvironmentIds: [IDS.subEnvironment],
    roomIds: [IDS.room],
    managedRoomIds: role === ROLES.ROOM_USER ? [] : [IDS.room],
    memberships: [{
        role,
        systemId: IDS.system,
        environmentId: role === ROLES.SUPER_ADMIN
            ? null
            : IDS.environment,
        subEnvironmentId: [
            ROLES.SYSTEM_ADMIN,
            ROLES.ROOM_MANAGER,
            ROLES.ROOM_USER
        ].includes(role)
            ? IDS.subEnvironment
            : null,
        roomId: [
            ROLES.ROOM_MANAGER,
            ROLES.ROOM_USER
        ].includes(role)
            ? IDS.room
            : null,
        scopeId: role === ROLES.SUPER_ADMIN
            ? IDS.system
            : role === ROLES.ENVIRONMENT_ADMIN
                ? IDS.environment
                : role === ROLES.SYSTEM_ADMIN
                    ? IDS.subEnvironment
                    : IDS.room
    }],
    ...overrides
});

test('ENVIRONMENT_ADMIN is a first-class ENVIRONMENT-scoped role', () => {
    assert.equal(
        ROLE_SCOPE_TYPES[ROLES.ENVIRONMENT_ADMIN],
        SCOPE_TYPES.ENVIRONMENT
    );
    assert.doesNotThrow(() => assertRoleScopeCompatibility(
        ROLES.ENVIRONMENT_ADMIN,
        SCOPE_TYPES.ENVIRONMENT
    ));
    assert.throws(() => assertRoleScopeCompatibility(
        ROLES.ENVIRONMENT_ADMIN,
        SCOPE_TYPES.SUB_ENVIRONMENT
    ));
});

test('hierarchy creation follows the requested role matrix', async () => {
    const integrityService = {
        resolveSystem: async () => ({ system: lineage.system }),
        resolveEnvironment: async () => ({
            system: lineage.system,
            environment: lineage.environment
        }),
        resolveSubEnvironment: async () => lineage
    };

    const actorAccess = new Map([
        ['super', accessFor(ROLES.SUPER_ADMIN)],
        ['environment', accessFor(ROLES.ENVIRONMENT_ADMIN)],
        ['sub', accessFor(ROLES.SYSTEM_ADMIN)],
        ['room-manager', accessFor(ROLES.ROOM_MANAGER)],
        ['room-user', accessFor(ROLES.ROOM_USER)]
    ]);

    const service = new OrganizationHierarchyAuthorizationService({
        scopeResolver: {
            resolveEffectiveAccess: async (userId) => actorAccess.get(userId)
        },
        integrityService
    });

    await assert.doesNotReject(
        service.assertCanCreateEnvironment('super', IDS.system)
    );
    await assert.rejects(
        service.assertCanCreateEnvironment('environment', IDS.system),
        { code: 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN' }
    );

    await assert.doesNotReject(
        service.assertCanCreateSubEnvironment(
            'environment',
            IDS.environment
        )
    );
    await assert.rejects(
        service.assertCanCreateSubEnvironment('sub', IDS.environment),
        { code: 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN' }
    );

    for (const actor of [
        'super',
        'environment',
        'sub',
        'room-manager'
    ]) {
        await assert.doesNotReject(
            service.assertCanCreateRoom(actor, IDS.subEnvironment)
        );
    }
    await assert.rejects(
        service.assertCanCreateRoom('room-user', IDS.subEnvironment),
        { code: 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN' }
    );
});

test('all active current-room members may edit, close and send tickets', () => {
    const service = new TicketAuthorizationService({
        scopeResolver: {}
    });
    const ticket = {
        systemId: IDS.system,
        environmentId: IDS.environment,
        subEnvironmentId: IDS.subEnvironment,
        currentRoomId: IDS.room,
        visibleRoomIds: [IDS.room],
        status: 'OPEN',
        activeTransferId: null
    };

    for (const role of Object.values(ROLES)) {
        const access = accessFor(role);
        assert.equal(service.canEdit(access, ticket), true, role);
        assert.equal(service.canClose(access, ticket), true, role);
        assert.equal(service.canTransfer(access, ticket), true, role);
    }
});

test('ROOM_USER can read settings but cannot save them', async () => {
    const service = new SettingsService({
        organization: {
            integrityService: {
                resolveRoom: async () => lineage
            }
        },
        scopeResolver: {
            resolveEffectiveAccess: async () => accessFor(ROLES.ROOM_USER)
        }
    });

    await assert.doesNotReject(
        service.authorize('room-user', IDS.room)
    );
    await assert.rejects(
        service.authorize('room-user', IDS.room, { write: true }),
        { code: 'SETTINGS_UPDATE_FORBIDDEN' }
    );
});

test('category definitions require management but pin/category assignment stays available', async () => {
    const accessByActor = {
        manager: accessFor(ROLES.ROOM_MANAGER),
        user: accessFor(ROLES.ROOM_USER)
    };
    const service = new TicketBoardAuthorizationService({
        organization: {
            integrityService: {
                resolveRoom: async () => lineage
            }
        },
        scopeResolver: {
            resolveEffectiveAccess: async (actor) => accessByActor[actor]
        }
    });

    await assert.doesNotReject(
        service.authorize('user', IDS.room, 'OPEN')
    );
    await assert.rejects(
        service.assertCanManage('user', IDS.room, 'OPEN'),
        { code: 'BOARD_MANAGEMENT_FORBIDDEN' }
    );
    await assert.doesNotReject(
        service.assertCanManage('manager', IDS.room, 'OPEN')
    );
});
