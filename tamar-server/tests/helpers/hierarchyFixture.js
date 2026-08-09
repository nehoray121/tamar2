const mongoose = require('mongoose');
const HierarchyIntegrityService = require('../../src/services/authorization/HierarchyIntegrityService.js');

const id = () => new mongoose.Types.ObjectId();

const createHierarchyFixture = () => {
    const ids = {
        system: id(),
        environmentA: id(),
        environmentB: id(),
        subEnvironmentA: id(),
        subEnvironmentB: id(),
        roomA: id(),
        roomB: id(),
        roomOutside: id()
    };

    const systems = [{ _id: ids.system, isActive: true }];
    const environments = [
        { _id: ids.environmentA, systemId: ids.system, isActive: true },
        { _id: ids.environmentB, systemId: ids.system, isActive: true }
    ];
    const subEnvironments = [
        { _id: ids.subEnvironmentA, environmentId: ids.environmentA, isActive: true },
        { _id: ids.subEnvironmentB, environmentId: ids.environmentB, isActive: true }
    ];
    const rooms = [
        { _id: ids.roomA, subEnvironmentId: ids.subEnvironmentA, isActive: true },
        { _id: ids.roomB, subEnvironmentId: ids.subEnvironmentA, isActive: true },
        { _id: ids.roomOutside, subEnvironmentId: ids.subEnvironmentB, isActive: true }
    ];

    const findActive = (items, value) => items.find((item) => item.isActive && String(item._id) === String(value)) || null;
    const hierarchyRepository = {
        findActiveSystemById: async (value) => findActive(systems, value),
        findActiveEnvironmentById: async (value) => findActive(environments, value),
        findActiveSubEnvironmentById: async (value) => findActive(subEnvironments, value),
        findActiveRoomById: async (value) => findActive(rooms, value),
        findActiveRoomIdsBySubEnvironmentIds: async (values) => {
            const allowed = new Set(values.map(String));
            return rooms.filter((room) => room.isActive && allowed.has(String(room.subEnvironmentId))).map((room) => room._id);
        }
    };

    return {
        ids,
        hierarchyRepository,
        hierarchyIntegrityService: new HierarchyIntegrityService({ hierarchyRepository })
    };
};

const subEnvironmentScope = (ids, overrides = {}) => ({
    scopeType: 'SUB_ENVIRONMENT',
    scopeId: ids.subEnvironmentA,
    systemId: ids.system,
    environmentId: ids.environmentA,
    subEnvironmentId: ids.subEnvironmentA,
    ...overrides
});

const roomScope = (ids, overrides = {}) => ({
    scopeType: 'ROOM',
    scopeId: ids.roomA,
    systemId: ids.system,
    environmentId: ids.environmentA,
    subEnvironmentId: ids.subEnvironmentA,
    roomId: ids.roomA,
    ...overrides
});

module.exports = { createHierarchyFixture, subEnvironmentScope, roomScope };
