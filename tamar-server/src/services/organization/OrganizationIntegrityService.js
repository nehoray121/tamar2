const mongoose = require('mongoose');
const AppError = require('../../errors/AppError.js');

const hierarchyError = (code, message, statusCode = 400) => new AppError({ statusCode, code, message });
const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const isOperational = (entity) => Boolean(entity?.isActive && !entity?.archivedAt);

class OrganizationIntegrityService {
    constructor({ systemRepository, environmentRepository, subEnvironmentRepository, roomRepository }) {
        this.systemRepository = systemRepository;
        this.environmentRepository = environmentRepository;
        this.subEnvironmentRepository = subEnvironmentRepository;
        this.roomRepository = roomRepository;
    }

    assertValidId(id, label) {
        if (!mongoose.isValidObjectId(id)) {
            throw hierarchyError('INVALID_ORGANIZATION_ID', `${label} must be a valid ObjectId`);
        }
    }

    assertOperational(entity, label) {
        if (!isOperational(entity)) {
            throw hierarchyError('ORGANIZATION_SCOPE_INACTIVE', `${label} is inactive or archived`);
        }
    }

    async resolveSystem(systemId, { requireOperational = true, session } = {}) {
        this.assertValidId(systemId, 'systemId');
        const system = await this.systemRepository.findById(systemId, { session });
        if (!system) throw hierarchyError('SYSTEM_NOT_FOUND', 'System was not found', 404);
        if (requireOperational) this.assertOperational(system, 'System');
        return { system };
    }

    async resolveEnvironment(environmentId, { systemId, requireOperational = true, session } = {}) {
        this.assertValidId(environmentId, 'environmentId');
        const environment = await this.environmentRepository.findById(environmentId, { session });
        if (!environment) throw hierarchyError('ENVIRONMENT_NOT_FOUND', 'Environment was not found', 404);
        const { system } = await this.resolveSystem(environment.systemId, { requireOperational, session });
        if (systemId && !sameId(environment.systemId, systemId)) {
            throw hierarchyError('INCONSISTENT_ORGANIZATION_LINEAGE', 'Environment does not belong to the submitted System');
        }
        if (requireOperational) this.assertOperational(environment, 'Environment');
        return { system, environment };
    }

    async resolveSubEnvironment(subEnvironmentId, {
        systemId, environmentId, requireOperational = true, session
    } = {}) {
        this.assertValidId(subEnvironmentId, 'subEnvironmentId');
        const subEnvironment = await this.subEnvironmentRepository.findById(subEnvironmentId, { session });
        if (!subEnvironment) throw hierarchyError('SUB_ENVIRONMENT_NOT_FOUND', 'SubEnvironment was not found', 404);
        const lineage = await this.resolveEnvironment(subEnvironment.environmentId, {
            systemId: subEnvironment.systemId,
            requireOperational,
            session
        });
        if (!sameId(subEnvironment.systemId, lineage.system._id)
            || (systemId && !sameId(subEnvironment.systemId, systemId))
            || (environmentId && !sameId(subEnvironment.environmentId, environmentId))) {
            throw hierarchyError('INCONSISTENT_ORGANIZATION_LINEAGE', 'SubEnvironment lineage is inconsistent');
        }
        if (requireOperational) this.assertOperational(subEnvironment, 'SubEnvironment');
        return { ...lineage, subEnvironment };
    }

    async resolveRoom(roomId, {
        systemId, environmentId, subEnvironmentId, requireOperational = true, session
    } = {}) {
        this.assertValidId(roomId, 'roomId');
        const room = await this.roomRepository.findById(roomId, { session });
        if (!room) throw hierarchyError('ROOM_NOT_FOUND', 'Room was not found', 404);
        const lineage = await this.resolveSubEnvironment(room.subEnvironmentId, {
            systemId: room.systemId,
            environmentId: room.environmentId,
            requireOperational,
            session
        });
        if (!sameId(room.systemId, lineage.system._id)
            || !sameId(room.environmentId, lineage.environment._id)
            || (systemId && !sameId(room.systemId, systemId))
            || (environmentId && !sameId(room.environmentId, environmentId))
            || (subEnvironmentId && !sameId(room.subEnvironmentId, subEnvironmentId))) {
            throw hierarchyError('INCONSISTENT_ORGANIZATION_LINEAGE', 'Room lineage is inconsistent');
        }
        if (requireOperational) this.assertOperational(room, 'Room');
        return { ...lineage, room };
    }

    async assertParentCanReceiveChild(parentLineage, childIsActive) {
        const entities = Object.values(parentLineage);
        if (entities.some((entity) => entity.archivedAt)) {
            throw hierarchyError('ARCHIVED_PARENT', 'Archived organization entities cannot receive children');
        }
        if (childIsActive && entities.some((entity) => !entity.isActive)) {
            throw hierarchyError('INACTIVE_PARENT', 'Active child requires an active parent chain');
        }
    }
}

module.exports = OrganizationIntegrityService;
module.exports.isOperational = isOperational;
module.exports.sameId = sameId;
