const AppError = require('../../errors/AppError.js');
const { ORGANIZATION_ENTITY_TYPES } = require('../../domain/organization/constants.js');

class OrganizationLifecycleService {
    constructor({
        systemRepository,
        environmentRepository,
        subEnvironmentRepository,
        roomRepository,
        integrityService
    }) {
        this.repositories = {
            [ORGANIZATION_ENTITY_TYPES.SYSTEM]: systemRepository,
            [ORGANIZATION_ENTITY_TYPES.ENVIRONMENT]: environmentRepository,
            [ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT]: subEnvironmentRepository,
            [ORGANIZATION_ENTITY_TYPES.ROOM]: roomRepository
        };
        this.environmentRepository = environmentRepository;
        this.subEnvironmentRepository = subEnvironmentRepository;
        this.roomRepository = roomRepository;
        this.integrityService = integrityService;
    }

    repositoryFor(entityType) {
        const repository = this.repositories[entityType];
        if (!repository) throw new TypeError(`Unsupported organization entity type: ${entityType}`);
        return repository;
    }

    async resolve(entityType, entityId, requireOperational = false) {
        if (entityType === ORGANIZATION_ENTITY_TYPES.SYSTEM) {
            return (await this.integrityService.resolveSystem(entityId, { requireOperational })).system;
        }
        if (entityType === ORGANIZATION_ENTITY_TYPES.ENVIRONMENT) {
            return (await this.integrityService.resolveEnvironment(entityId, { requireOperational })).environment;
        }
        if (entityType === ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT) {
            return (await this.integrityService.resolveSubEnvironment(entityId, { requireOperational })).subEnvironment;
        }
        return (await this.integrityService.resolveRoom(entityId, { requireOperational })).room;
    }

    async deactivateEntity(entityType, entityId, actorUserId) {
        await this.resolve(entityType, entityId);
        return this.repositoryFor(entityType).updateById(entityId, { isActive: false, updatedBy: actorUserId });
    }

    async reactivateEntity(entityType, entityId, actorUserId) {
        const entity = await this.resolve(entityType, entityId);
        if (entity.archivedAt) {
            throw new AppError({ statusCode: 409, code: 'ARCHIVED_ENTITY', message: 'Archived entity cannot be reactivated' });
        }
        if (entityType === ORGANIZATION_ENTITY_TYPES.ENVIRONMENT) {
            await this.integrityService.resolveSystem(entity.systemId);
        } else if (entityType === ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT) {
            await this.integrityService.resolveEnvironment(entity.environmentId, { systemId: entity.systemId });
        } else if (entityType === ORGANIZATION_ENTITY_TYPES.ROOM) {
            await this.integrityService.resolveSubEnvironment(entity.subEnvironmentId, {
                systemId: entity.systemId,
                environmentId: entity.environmentId
            });
        }
        return this.repositoryFor(entityType).updateById(entityId, { isActive: true, updatedBy: actorUserId });
    }

    async archiveEntity(entityType, entityId, actorUserId) {
        const entity = await this.resolve(entityType, entityId);
        let activeChildren = 0;
        if (entityType === ORGANIZATION_ENTITY_TYPES.SYSTEM) {
            activeChildren = await this.environmentRepository.countActiveBySystemId(entityId);
        } else if (entityType === ORGANIZATION_ENTITY_TYPES.ENVIRONMENT) {
            activeChildren = await this.subEnvironmentRepository.countActiveByEnvironmentId(entityId);
        } else if (entityType === ORGANIZATION_ENTITY_TYPES.SUB_ENVIRONMENT) {
            activeChildren = await this.roomRepository.countActiveBySubEnvironmentId(entityId);
        }
        if (activeChildren > 0) {
            throw new AppError({
                statusCode: 409,
                code: 'ACTIVE_CHILDREN_EXIST',
                message: 'Entity cannot be archived while active children exist'
            });
        }
        return this.repositoryFor(entityType).updateById(entityId, {
            isActive: false,
            archivedAt: new Date(),
            archivedBy: actorUserId,
            updatedBy: actorUserId
        });
    }
}

module.exports = OrganizationLifecycleService;
