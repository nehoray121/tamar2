const AppError = require('../../errors/AppError.js');
const { REQUESTABLE_ROLES, ROLE_SCOPE_TYPES } = require('../../domain/access/constants.js');
const sameId = (left, right) => String(left ?? '') === String(right ?? '');
class AccessRequestOptionsService {
    constructor({ organization }) { this.organization = organization; }
    async getOptions({ systemId, environmentId, subEnvironmentId } = {}) {
        if (environmentId && !systemId) throw new AppError({ statusCode: 400, code: 'SCOPE_LINEAGE_MISMATCH', message: 'environmentId requires systemId' });
        if (subEnvironmentId && !environmentId) throw new AppError({ statusCode: 400, code: 'SCOPE_LINEAGE_MISMATCH', message: 'subEnvironmentId requires environmentId' });
        if (systemId && !(await this.organization.hierarchyAdapter.findActiveSystemById(systemId))) throw new AppError({ statusCode: 404, code: 'SCOPE_NOT_FOUND', message: 'System is not active' });
        if (environmentId) {
            const lineage = await this.organization.hierarchyService.resolveLineage('ENVIRONMENT', environmentId, { requireOperational: true });
            if (!sameId(lineage.system._id, systemId)) throw new AppError({ statusCode: 400, code: 'SCOPE_LINEAGE_MISMATCH', message: 'Environment does not belong to System' });
        }
        if (subEnvironmentId) {
            const lineage = await this.organization.hierarchyService.resolveLineage('SUB_ENVIRONMENT', subEnvironmentId, { requireOperational: true });
            if (!sameId(lineage.environment._id, environmentId) || !sameId(lineage.system._id, systemId)) throw new AppError({ statusCode: 400, code: 'SCOPE_LINEAGE_MISMATCH', message: 'Sub-environment lineage is invalid' });
        }
        const systems = await this.organization.systemRepository.findOperational();
        const environments = systemId ? await this.organization.environmentRepository.findBySystemId(systemId, { operationalOnly: true }) : [];
        const subEnvironments = environmentId ? await this.organization.subEnvironmentRepository.findByEnvironmentId(environmentId, { operationalOnly: true }) : [];
        const rooms = subEnvironmentId ? await this.organization.roomRepository.findBySubEnvironmentIds([subEnvironmentId], { operationalOnly: true }) : [];
        return {
            systems: systems.map(this.safeEntity), environments: environments.map(this.safeEntity),
            subEnvironments: subEnvironments.map(this.safeEntity), rooms: rooms.map(this.safeEntity),
            requestableRoles: REQUESTABLE_ROLES.map((role) => ({ role, scopeType: ROLE_SCOPE_TYPES[role] }))
        };
    }
    safeEntity(entity) { return { id: String(entity._id), key: entity.key, name: entity.name }; }
}

module.exports = AccessRequestOptionsService;
