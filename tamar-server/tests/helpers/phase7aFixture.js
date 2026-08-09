const { ROLES, ROLE_SCOPE_TYPES } = require('../../src/domain/access/constants.js');

let counter = 0;

const addMembership = (services, user, role, graph) => {
    const roomRole = [ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(role);
    const systemRole = role === ROLES.SUPER_ADMIN;
    const scopeId = systemRole ? graph.system._id
        : roomRole ? graph.room._id : graph.subEnvironment._id;
    return services.membershipRepository.create({
        userId: user._id,
        role,
        scopeType: ROLE_SCOPE_TYPES[role],
        scopeId,
        systemId: graph.system._id,
        environmentId: systemRole ? undefined : graph.environment._id,
        subEnvironmentId: systemRole ? undefined : graph.subEnvironment._id,
        roomId: roomRole ? graph.room._id : undefined,
        isActive: true,
        assignedBy: user._id
    });
};

const createUser = (services, displayName) => services.userRepository.create({
    displayName,
    email: `${displayName.toLowerCase().replaceAll(' ', '.')}@example.test`,
    isActive: true
});

const createPhase7aFixture = async (services, label = 'fixture') => {
    counter += 1;
    const key = `p7-${label}-${counter}`.toLowerCase();
    const management = services.organization.managementService;
    const system = await management.createSystem({ key: `P7${counter}`, name: `Phase 7 ${label}` });
    const environment = await management.createEnvironment({
        systemId: system._id, key: `${key}-environment`, name: 'Environment'
    });
    const subEnvironment = await management.createSubEnvironment({
        systemId: system._id,
        environmentId: environment._id,
        key: `${key}-sub-environment`,
        name: 'Sub Environment'
    });
    const rooms = {};
    for (const roomName of ['a', 'b', 'c']) {
        rooms[roomName] = await management.createRoom({
            systemId: system._id,
            environmentId: environment._id,
            subEnvironmentId: subEnvironment._id,
            key: `${key}-room-${roomName}`,
            name: `Room ${roomName.toUpperCase()}`
        });
    }
    const graph = (room) => ({ system, environment, subEnvironment, room });
    const users = {
        sourceManager: await createUser(services, `Source Manager ${counter}`),
        sourceUser: await createUser(services, `Source User ${counter}`),
        destinationManager: await createUser(services, `Destination Manager ${counter}`),
        destinationUser: await createUser(services, `Destination User ${counter}`),
        thirdManager: await createUser(services, `Third Manager ${counter}`),
        systemAdmin: await createUser(services, `System Admin ${counter}`),
        superAdmin: await createUser(services, `Super Admin ${counter}`),
        unrelated: await createUser(services, `Unrelated ${counter}`)
    };
    await Promise.all([
        addMembership(services, users.sourceManager, ROLES.ROOM_MANAGER, graph(rooms.a)),
        addMembership(services, users.sourceUser, ROLES.ROOM_USER, graph(rooms.a)),
        addMembership(services, users.destinationManager, ROLES.ROOM_MANAGER, graph(rooms.b)),
        addMembership(services, users.destinationUser, ROLES.ROOM_USER, graph(rooms.b)),
        addMembership(services, users.thirdManager, ROLES.ROOM_MANAGER, graph(rooms.c)),
        addMembership(services, users.systemAdmin, ROLES.SYSTEM_ADMIN, graph(rooms.a)),
        addMembership(services, users.superAdmin, ROLES.SUPER_ADMIN, graph(rooms.a))
    ]);
    const ticket = await services.tickets.ticketService.create(users.sourceManager._id, {
        roomId: String(rooms.a._id),
        subject: 'Continuous text chat',
        description: 'Phase 7A ticket chat fixture',
        priority: 'MEDIUM'
    });
    return { system, environment, subEnvironment, rooms, users, ticket };
};

module.exports = { addMembership, createPhase7aFixture, createUser };
