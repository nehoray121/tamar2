const {
    sanitizeOrganizationPayload
} = require('../../domain/organization/validators.js');

const ROOT_FIELDS = [
    'key',
    'name',
    'description',
    'isActive',
    'createdBy',
    'updatedBy'
];
const UPDATE_FIELDS = ['key', 'name', 'description', 'updatedBy'];

class OrganizationManagementService {
    constructor({
        systemRepository,
        environmentRepository,
        subEnvironmentRepository,
        roomRepository,
        integrityService
    }) {
        Object.assign(this, {
            systemRepository,
            environmentRepository,
            subEnvironmentRepository,
            roomRepository,
            integrityService
        });
    }

    async createSystem(payload, options = {}) {
        return this.systemRepository.create(
            sanitizeOrganizationPayload(payload, ROOT_FIELDS),
            options
        );
    }

    async updateSystem(systemId, payload, options = {}) {
        await this.integrityService.resolveSystem(systemId, {
            requireOperational: false,
            session: options.session
        });
        return this.systemRepository.updateById(
            systemId,
            sanitizeOrganizationPayload(payload, UPDATE_FIELDS),
            options
        );
    }

    async createEnvironment(payload, options = {}) {
        const fields = sanitizeOrganizationPayload(
            payload,
            [...ROOT_FIELDS, 'systemId']
        );
        const lineage = await this.integrityService.resolveSystem(
            fields.systemId,
            {
                requireOperational: false,
                session: options.session
            }
        );
        await this.integrityService.assertParentCanReceiveChild(
            lineage,
            fields.isActive !== false
        );
        return this.environmentRepository.create(fields, options);
    }

    async updateEnvironment(environmentId, payload, options = {}) {
        await this.integrityService.resolveEnvironment(environmentId, {
            requireOperational: false,
            session: options.session
        });
        return this.environmentRepository.updateById(
            environmentId,
            sanitizeOrganizationPayload(payload, UPDATE_FIELDS),
            options
        );
    }

    async createSubEnvironment(payload, options = {}) {
        const fields = sanitizeOrganizationPayload(payload, [
            ...ROOT_FIELDS,
            'systemId',
            'environmentId'
        ]);
        const lineage = await this.integrityService.resolveEnvironment(
            fields.environmentId,
            {
                systemId: fields.systemId,
                requireOperational: false,
                session: options.session
            }
        );
        await this.integrityService.assertParentCanReceiveChild(
            lineage,
            fields.isActive !== false
        );
        return this.subEnvironmentRepository.create(fields, options);
    }

    async updateSubEnvironment(subEnvironmentId, payload, options = {}) {
        await this.integrityService.resolveSubEnvironment(subEnvironmentId, {
            requireOperational: false,
            session: options.session
        });
        return this.subEnvironmentRepository.updateById(
            subEnvironmentId,
            sanitizeOrganizationPayload(payload, UPDATE_FIELDS),
            options
        );
    }

    async createRoom(payload, options = {}) {
        const fields = sanitizeOrganizationPayload(payload, [
            ...ROOT_FIELDS,
            'systemId',
            'environmentId',
            'subEnvironmentId'
        ]);
        const lineage = await this.integrityService.resolveSubEnvironment(
            fields.subEnvironmentId,
            {
                systemId: fields.systemId,
                environmentId: fields.environmentId,
                requireOperational: false,
                session: options.session
            }
        );
        await this.integrityService.assertParentCanReceiveChild(
            lineage,
            fields.isActive !== false
        );
        return this.roomRepository.create(fields, options);
    }

    async updateRoom(roomId, payload, options = {}) {
        await this.integrityService.resolveRoom(roomId, {
            requireOperational: false,
            session: options.session
        });
        return this.roomRepository.updateById(
            roomId,
            sanitizeOrganizationPayload(payload, UPDATE_FIELDS),
            options
        );
    }
}

module.exports = OrganizationManagementService;
