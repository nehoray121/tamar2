const { SCOPE_TYPES } = require('../../domain/access/constants.js');
const { ORGANIZATION_ENTITY_TYPES } = require('../../domain/organization/constants.js');

const mapLineage = (lineage) => ({
    systemId: lineage.system?._id,
    environmentId: lineage.environment?._id,
    subEnvironmentId: lineage.subEnvironment?._id,
    roomId: lineage.room?._id
});
const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class MongoHierarchyAdapter {
    constructor({
        hierarchyService,
        systemRepository,
        environmentRepository,
        subEnvironmentRepository,
        roomRepository
    }) {
        Object.assign(this, {
            hierarchyService,
            systemRepository,
            environmentRepository,
            subEnvironmentRepository,
            roomRepository
        });
    }

    async safeResolve(entityType, id, options = {}) {
        try {
            return await this.hierarchyService.resolveLineage(entityType, id, {
                requireOperational: true,
                ...options
            });
        } catch {
            return null;
        }
    }

    async findActiveSystemById(id) {
        return (await this.safeResolve(ORGANIZATION_ENTITY_TYPES.SYSTEM, id))?.system || null;
    }

    async findActiveEnvironmentById(id) {
        return (await this.safeResolve(ORGANIZATION_ENTITY_TYPES.ENVIRONMENT, id))?.environment || null;
    }

    async findActiveSubEnvironmentById(id) {
        return (await this.safeResolve(
            ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT,
            id
        ))?.subEnvironment || null;
    }

    async findActiveRoomById(id) {
        return (await this.safeResolve(ORGANIZATION_ENTITY_TYPES.ROOM, id))?.room || null;
    }

    async filterOperationalRooms(rooms, options = {}) {
        const resolved = await Promise.all(rooms.map(async (room) => (
            (await this.safeResolve(ORGANIZATION_ENTITY_TYPES.ROOM, room._id, options))
                ? room._id
                : null
        )));
        return resolved.filter(Boolean);
    }

    async findActiveRoomIdsBySubEnvironmentIds(ids, options = {}) {
        const rooms = await this.roomRepository.findBySubEnvironmentIds(ids, {
            ...options,
            operationalOnly: true
        });
        return this.filterOperationalRooms(rooms, options);
    }

    async findActiveRoomIdsByEnvironmentIds(ids, options = {}) {
        const rooms = await this.roomRepository.findByEnvironmentIds(ids, {
            ...options,
            operationalOnly: true
        });
        return this.filterOperationalRooms(rooms, options);
    }

    async findActiveSubEnvironmentIdsByEnvironmentIds(ids, options = {}) {
        const entities = await this.subEnvironmentRepository.findByEnvironmentIds(ids, {
            ...options,
            operationalOnly: true
        });
        const resolved = await Promise.all(entities.map(async (entity) => (
            (await this.safeResolve(
                ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT,
                entity._id,
                options
            ))
                ? entity._id
                : null
        )));
        return resolved.filter(Boolean);
    }

    async findActiveRoomIdsBySystemIds(ids, options = {}) {
        const rooms = await this.roomRepository.findBySystemIds(ids, {
            ...options,
            operationalOnly: true
        });
        return this.filterOperationalRooms(rooms, options);
    }

    async isRoomInSubEnvironment(roomId, subEnvironmentId) {
        const lineage = await this.safeResolve(ORGANIZATION_ENTITY_TYPES.ROOM, roomId);
        return sameId(lineage?.subEnvironment?._id, subEnvironmentId);
    }

    async isSubEnvironmentInEnvironment(subEnvironmentId, environmentId) {
        const lineage = await this.safeResolve(
            ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT,
            subEnvironmentId
        );
        return sameId(lineage?.environment?._id, environmentId);
    }

    async isRoomInEnvironment(roomId, environmentId) {
        const lineage = await this.safeResolve(ORGANIZATION_ENTITY_TYPES.ROOM, roomId);
        return sameId(lineage?.environment?._id, environmentId);
    }

    async getSubEnvironmentForRoom(roomId) {
        return (await this.safeResolve(
            ORGANIZATION_ENTITY_TYPES.ROOM,
            roomId
        ))?.subEnvironment || null;
    }

    async getEnvironmentForSubEnvironment(subEnvironmentId) {
        return (await this.safeResolve(
            ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT,
            subEnvironmentId
        ))?.environment || null;
    }

    async getEnvironmentForRoom(roomId) {
        return (await this.safeResolve(
            ORGANIZATION_ENTITY_TYPES.ROOM,
            roomId
        ))?.environment || null;
    }

    async getSystemForEnvironment(environmentId) {
        return (await this.safeResolve(
            ORGANIZATION_ENTITY_TYPES.ENVIRONMENT,
            environmentId
        ))?.system || null;
    }

    async getDescendantRoomIdsForSubEnvironment(subEnvironmentId) {
        return this.findActiveRoomIdsBySubEnvironmentIds([subEnvironmentId]);
    }

    async getDescendantRoomIdsForEnvironment(environmentId) {
        return this.findActiveRoomIdsByEnvironmentIds([environmentId]);
    }

    async isScopeActive(scopeType, scopeId) {
        return Boolean(await this.resolveScopeLineage(scopeType, scopeId));
    }

    async resolveScopeLineage(scopeType, scopeId, options = {}) {
        const entityTypeByScope = {
            [SCOPE_TYPES.SYSTEM]: ORGANIZATION_ENTITY_TYPES.SYSTEM,
            [SCOPE_TYPES.ENVIRONMENT]: ORGANIZATION_ENTITY_TYPES.ENVIRONMENT,
            [SCOPE_TYPES.SUB_ENVIRONMENT]: ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT,
            [SCOPE_TYPES.ROOM]: ORGANIZATION_ENTITY_TYPES.ROOM
        };
        const lineage = await this.safeResolve(entityTypeByScope[scopeType], scopeId, options);
        return lineage ? mapLineage(lineage) : null;
    }
}

module.exports = MongoHierarchyAdapter;
