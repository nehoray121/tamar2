const { ORGANIZATION_ENTITY_TYPES } = require('../../domain/organization/constants.js');

class OrganizationHierarchyService {
    constructor({ integrityService, environmentRepository, subEnvironmentRepository, roomRepository }) {
        this.integrityService = integrityService;
        this.environmentRepository = environmentRepository;
        this.subEnvironmentRepository = subEnvironmentRepository;
        this.roomRepository = roomRepository;
    }

    async getSystemById(systemId, options = {}) {
        return (await this.integrityService.resolveSystem(systemId, options)).system;
    }

    async getEnvironmentById(environmentId, options = {}) {
        return (await this.integrityService.resolveEnvironment(environmentId, options)).environment;
    }

    async getSubEnvironmentById(subEnvironmentId, options = {}) {
        return (await this.integrityService.resolveSubEnvironment(subEnvironmentId, options)).subEnvironment;
    }

    async getRoomById(roomId, options = {}) {
        return (await this.integrityService.resolveRoom(roomId, options)).room;
    }

    async resolveLineage(entityType, entityId, options = {}) {
        if (entityType === ORGANIZATION_ENTITY_TYPES.SYSTEM) {
            return this.integrityService.resolveSystem(entityId, options);
        }
        if (entityType === ORGANIZATION_ENTITY_TYPES.ENVIRONMENT) {
            return this.integrityService.resolveEnvironment(entityId, options);
        }
        if (entityType === ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT) {
            return this.integrityService.resolveSubEnvironment(entityId, options);
        }
        if (entityType === ORGANIZATION_ENTITY_TYPES.ROOM) {
            return this.integrityService.resolveRoom(entityId, options);
        }
        throw new TypeError(`Unsupported organization entity type: ${entityType}`);
    }

    async getDescendantSubEnvironmentsForEnvironment(environmentId, { operationalOnly = true } = {}) {
        await this.integrityService.resolveEnvironment(environmentId, { requireOperational: operationalOnly });
        return this.subEnvironmentRepository.findByEnvironmentId(environmentId, { operationalOnly });
    }

    async getDescendantRoomsForSubEnvironment(subEnvironmentId, { operationalOnly = true } = {}) {
        await this.integrityService.resolveSubEnvironment(subEnvironmentId, { requireOperational: operationalOnly });
        return this.roomRepository.findBySubEnvironmentIds([subEnvironmentId], { operationalOnly });
    }

    async getDescendantRoomsForEnvironment(environmentId, { operationalOnly = true } = {}) {
        await this.integrityService.resolveEnvironment(environmentId, { requireOperational: operationalOnly });
        return this.roomRepository.findByEnvironmentId(environmentId, { operationalOnly });
    }
}

module.exports = OrganizationHierarchyService;
