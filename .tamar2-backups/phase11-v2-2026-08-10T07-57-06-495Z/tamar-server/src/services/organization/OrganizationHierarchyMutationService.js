const { normalizeOrganizationKey } = require('../../domain/organization/validators.js');

const keyFromName = (name) => {
    const normalized = String(name ?? '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_-]+/gu, '-')
        .replace(/^-+|-+$/gu, '')
        .slice(0, 64);

    if (normalized.length >= 2) return normalizeOrganizationKey(normalized);
    const encoded = Buffer.from(String(name ?? '').normalize('NFKC'), 'utf8').toString('hex').slice(0, 48);
    return normalizeOrganizationKey(`item-${encoded || 'unnamed'}`);
};

const toOrganizationEntityDto = (entity) => ({
    id: String(entity._id),
    key: entity.key,
    name: entity.name,
    description: entity.description || '',
    isActive: Boolean(entity.isActive),
    systemId: entity.systemId ? String(entity.systemId) : null,
    environmentId: entity.environmentId ? String(entity.environmentId) : null,
    subEnvironmentId: entity.subEnvironmentId ? String(entity.subEnvironmentId) : null,
    createdAt: entity.createdAt
});

class OrganizationHierarchyMutationService {
    constructor({ managementService, authorizationService }) {
        this.managementService = managementService;
        this.authorizationService = authorizationService;
    }

    async createSubEnvironment(userId, environmentId, input) {
        const lineage = await this.authorizationService.assertCanCreateSubEnvironment(userId, environmentId);
        const entity = await this.managementService.createSubEnvironment({
            systemId: lineage.system._id,
            environmentId: lineage.environment._id,
            key: keyFromName(input.name),
            name: input.name,
            description: input.description,
            isActive: true,
            createdBy: userId,
            updatedBy: userId
        });
        return toOrganizationEntityDto(entity);
    }

    async createRoom(userId, subEnvironmentId, input) {
        const lineage = await this.authorizationService.assertCanCreateRoom(userId, subEnvironmentId);
        const entity = await this.managementService.createRoom({
            systemId: lineage.system._id,
            environmentId: lineage.environment._id,
            subEnvironmentId: lineage.subEnvironment._id,
            key: keyFromName(input.name),
            name: input.name,
            description: input.description,
            isActive: true,
            createdBy: userId,
            updatedBy: userId
        });
        return toOrganizationEntityDto(entity);
    }
}

module.exports = OrganizationHierarchyMutationService;
module.exports.keyFromName = keyFromName;
module.exports.toOrganizationEntityDto = toOrganizationEntityDto;

