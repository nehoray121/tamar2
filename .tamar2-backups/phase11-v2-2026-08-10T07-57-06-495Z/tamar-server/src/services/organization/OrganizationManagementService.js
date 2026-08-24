const { sanitizeOrganizationPayload } = require('../../domain/organization/validators.js');

const ROOT_FIELDS = ['key', 'name', 'description', 'isActive', 'createdBy', 'updatedBy'];
const UPDATE_FIELDS = ['key', 'name', 'description', 'updatedBy'];

class OrganizationManagementService {
    constructor({ systemRepository, environmentRepository, subEnvironmentRepository, roomRepository, integrityService }) {
        this.systemRepository = systemRepository;
        this.environmentRepository = environmentRepository;
        this.subEnvironmentRepository = subEnvironmentRepository;
        this.roomRepository = roomRepository;
        this.integrityService = integrityService;
    }

    async createSystem(payload) {
        return this.systemRepository.create(sanitizeOrganizationPayload(payload, ROOT_FIELDS));
    }

    async updateSystem(systemId, payload) {
        await this.integrityService.resolveSystem(systemId, { requireOperational: false });
        return this.systemRepository.updateById(systemId, sanitizeOrganizationPayload(payload, UPDATE_FIELDS));
    }

    async createEnvironment(payload) {
        const fields = sanitizeOrganizationPayload(payload, [...ROOT_FIELDS, 'systemId']);
        const lineage = await this.integrityService.resolveSystem(fields.systemId, { requireOperational: false });
        await this.integrityService.assertParentCanReceiveChild(lineage, fields.isActive !== false);
        return this.environmentRepository.create(fields);
    }

    async updateEnvironment(environmentId, payload) {
        await this.integrityService.resolveEnvironment(environmentId, { requireOperational: false });
        return this.environmentRepository.updateById(environmentId, sanitizeOrganizationPayload(payload, UPDATE_FIELDS));
    }

    async createSubEnvironment(payload) {
        const fields = sanitizeOrganizationPayload(payload, [...ROOT_FIELDS, 'systemId', 'environmentId']);
        const lineage = await this.integrityService.resolveEnvironment(fields.environmentId, {
            systemId: fields.systemId,
            requireOperational: false
        });
        await this.integrityService.assertParentCanReceiveChild(lineage, fields.isActive !== false);
        return this.subEnvironmentRepository.create(fields);
    }

    async updateSubEnvironment(subEnvironmentId, payload) {
        await this.integrityService.resolveSubEnvironment(subEnvironmentId, { requireOperational: false });
        return this.subEnvironmentRepository.updateById(subEnvironmentId, sanitizeOrganizationPayload(payload, UPDATE_FIELDS));
    }

    async createRoom(payload) {
        const fields = sanitizeOrganizationPayload(payload, [
            ...ROOT_FIELDS, 'systemId', 'environmentId', 'subEnvironmentId'
        ]);
        const lineage = await this.integrityService.resolveSubEnvironment(fields.subEnvironmentId, {
            systemId: fields.systemId,
            environmentId: fields.environmentId,
            requireOperational: false
        });
        await this.integrityService.assertParentCanReceiveChild(lineage, fields.isActive !== false);
        return this.roomRepository.create(fields);
    }

    async updateRoom(roomId, payload) {
        await this.integrityService.resolveRoom(roomId, { requireOperational: false });
        return this.roomRepository.updateById(roomId, sanitizeOrganizationPayload(payload, UPDATE_FIELDS));
    }
}

module.exports = OrganizationManagementService;
