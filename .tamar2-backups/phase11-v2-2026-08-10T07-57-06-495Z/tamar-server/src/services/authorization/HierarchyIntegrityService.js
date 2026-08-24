const AppError = require('../../errors/AppError.js');
const { SCOPE_TYPES } = require('../../domain/access/constants.js');
const { assertHierarchyReferences } = require('../../domain/access/validators.js');

const invalidHierarchy = (message) => new AppError({
    statusCode: 400,
    code: 'INVALID_SCOPE_HIERARCHY',
    message
});

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class HierarchyIntegrityService {
    constructor({ hierarchyRepository }) {
        this.hierarchyRepository = hierarchyRepository;
    }

    async resolveUsingCanonicalAdapter(input, options = {}) {
        const lineage = await this.hierarchyRepository.resolveScopeLineage(input.scopeType, input.scopeId, options);
        if (!lineage) throw invalidHierarchy('Requested organizational scope does not exist or is inactive');
        if (!sameId(lineage.systemId, input.systemId)
            || (input.environmentId && !sameId(lineage.environmentId, input.environmentId))
            || (input.subEnvironmentId && !sameId(lineage.subEnvironmentId, input.subEnvironmentId))
            || (input.roomId && !sameId(lineage.roomId, input.roomId))) {
            throw invalidHierarchy('Submitted organization lineage does not match the canonical scope lineage');
        }

        return {
            ...input,
            scopeId: input.scopeId,
            systemId: lineage.systemId,
            environmentId: lineage.environmentId,
            subEnvironmentId: lineage.subEnvironmentId,
            roomId: lineage.roomId
        };
    }

    async resolveScope(input, options = {}) {
        assertHierarchyReferences(input);

        if (typeof this.hierarchyRepository.resolveScopeLineage === 'function') {
            return this.resolveUsingCanonicalAdapter(input, options);
        }

        const system = await this.hierarchyRepository.findActiveSystemById(input.systemId);
        if (!system) throw invalidHierarchy('Requested system does not exist or is inactive');

        if (input.scopeType === SCOPE_TYPES.SYSTEM) {
            return { ...input, scopeId: system._id, systemId: system._id };
        }

        const [environment, subEnvironment] = await Promise.all([
            this.hierarchyRepository.findActiveEnvironmentById(input.environmentId),
            this.hierarchyRepository.findActiveSubEnvironmentById(input.subEnvironmentId)
        ]);

        if (!environment || !subEnvironment) {
            throw invalidHierarchy('Requested organizational scope does not exist or is inactive');
        }
        if (!sameId(environment.systemId, system._id) || !sameId(subEnvironment.environmentId, environment._id)) {
            throw invalidHierarchy('Sub-environment does not belong to the submitted environment and system');
        }

        if (input.scopeType === SCOPE_TYPES.SUB_ENVIRONMENT) {
            return {
                ...input,
                scopeId: subEnvironment._id,
                systemId: system._id,
                environmentId: environment._id,
                subEnvironmentId: subEnvironment._id,
                roomId: undefined
            };
        }

        const room = await this.hierarchyRepository.findActiveRoomById(input.roomId);
        if (!room || !sameId(room.subEnvironmentId, subEnvironment._id)) {
            throw invalidHierarchy('Room does not belong to the submitted sub-environment');
        }

        return {
            ...input,
            scopeId: room._id,
            systemId: system._id,
            environmentId: environment._id,
            subEnvironmentId: subEnvironment._id,
            roomId: room._id
        };
    }

    async isScopeOperational(membership, options = {}) {
        try {
            await this.resolveScope({
                role: membership.role,
                scopeType: membership.scopeType,
                scopeId: membership.scopeId,
                systemId: membership.systemId,
                environmentId: membership.environmentId,
                subEnvironmentId: membership.subEnvironmentId,
                roomId: membership.roomId
            }, options);
            return true;
        } catch {
            return false;
        }
    }

    async getActiveRoomIdsForSubEnvironments(subEnvironmentIds, options = {}) {
        return this.hierarchyRepository.findActiveRoomIdsBySubEnvironmentIds(subEnvironmentIds, options);
    }

    async getActiveRoomIdsForSystems(systemIds, options = {}) {
        if (typeof this.hierarchyRepository.findActiveRoomIdsBySystemIds !== 'function') return [];
        return this.hierarchyRepository.findActiveRoomIdsBySystemIds(systemIds, options);
    }
}

module.exports = HierarchyIntegrityService;
