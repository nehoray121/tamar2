import { authenticatedHttpClient } from '../../tickets/boards/api/authenticatedHttpClient.js';

export const emptyOrganizationHierarchy = () => ({
    systems: [],
    environments: [],
    subEnvironments: [],
    rooms: []
});

const idOf = (value) => String(value?.id || value?._id || value || '');
const idSet = (values = []) => new Set(values.map(idOf).filter(Boolean));
const isAllowed = (access, allowed, value) => Boolean(access.global || allowed.has(idOf(value)));

const normalizeEntity = (entity, lineage = {}) => ({
    id: idOf(entity),
    backendId: idOf(entity),
    key: entity?.key || '',
    name: entity?.name || '',
    isActive: true,
    ...lineage
});

export const createRuntimeOrganizationApi = (request = authenticatedHttpClient) => {
    const requestOptions = async (params, signal) => {
        const search = new URLSearchParams(
            Object.entries(params || {}).filter(([, value]) => Boolean(value))
        );
        const response = await request(
            `/api/access-request-options${search.size ? `?${search.toString()}` : ''}`,
            { signal }
        );
        return response.data || {};
    };

    return async ({ signal } = {}) => {
        const authentication = await request('/api/auth/me', { signal });
        const authState = authentication.data || {};

        if (authState.status !== 'AUTHORIZED') {
            return { authState, hierarchy: emptyOrganizationHierarchy() };
        }

        const access = authState.effectiveAccess || {};
        const allowedSystems = idSet(access.systemIds);
        const allowedEnvironments = idSet(access.environmentIds);
        const allowedSubEnvironments = idSet(access.subEnvironmentIds);
        const allowedRooms = idSet(access.roomIds);
        const rootOptions = await requestOptions({}, signal);
        const systems = (rootOptions.systems || [])
            .filter((system) => allowedSystems.has(idOf(system)))
            .map((system) => normalizeEntity(system));

        const environmentGroups = await Promise.all(systems.map(async (system) => {
            const options = await requestOptions({ systemId: system.id }, signal);
            return (options.environments || [])
                .filter((environment) => isAllowed(access, allowedEnvironments, environment))
                .map((environment) => normalizeEntity(environment, { systemId: system.id }));
        }));
        const environments = environmentGroups.flat();

        const subEnvironmentGroups = await Promise.all(environments.map(async (environment) => {
            const options = await requestOptions({
                systemId: environment.systemId,
                environmentId: environment.id
            }, signal);
            return (options.subEnvironments || [])
                .filter((subEnvironment) => isAllowed(access, allowedSubEnvironments, subEnvironment))
                .map((subEnvironment) => normalizeEntity(subEnvironment, {
                    systemId: environment.systemId,
                    environmentId: environment.id
                }));
        }));
        const subEnvironments = subEnvironmentGroups.flat();

        const roomGroups = await Promise.all(subEnvironments.map(async (subEnvironment) => {
            const options = await requestOptions({
                systemId: subEnvironment.systemId,
                environmentId: subEnvironment.environmentId,
                subEnvironmentId: subEnvironment.id
            }, signal);
            return (options.rooms || [])
                .filter((room) => isAllowed(access, allowedRooms, room))
                .map((room) => normalizeEntity(room, {
                    systemId: subEnvironment.systemId,
                    environmentId: subEnvironment.environmentId,
                    subEnvironmentId: subEnvironment.id
                }));
        }));
        const rooms = roomGroups.flat();

        return {
            authState,
            hierarchy: {
                systems,
                environments,
                subEnvironments,
                rooms
            }
        };
    };
};

export const loadRuntimeOrganizationContext = createRuntimeOrganizationApi();
