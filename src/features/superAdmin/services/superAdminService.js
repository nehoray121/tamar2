import { controlCenterApi } from '../api/controlCenterApi.js';

const dateValue = (date) => date.toISOString().slice(0, 10);
const resolveDates = (filter = {}) => {
    if (filter.preset === 'custom' && filter.customRange?.from && filter.customRange?.to) {
        return { dateFrom: filter.customRange.from, dateTo: filter.customRange.to };
    }
    const days = filter.preset === '7d' ? 7 : filter.preset === '30d' ? 30 : 14;
    const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - (days - 1));
    return { dateFrom: dateValue(from), dateTo: dateValue(to) };
};
const normalizeOrganization = (organization = {}) => {
    const normalize = (item) => ({ ...item, envId: item.environmentId || item.envId, kind: item.kind === 'subEnvironment' ? 'sub' : item.kind });
    return {
        ...organization,
        systems: (organization.systems || []).map(normalize),
        environments: (organization.environments || []).map(normalize),
        subEnvironments: (organization.subEnvironments || []).map(normalize),
        rooms: (organization.rooms || []).map(normalize),
        visibleItems: (organization.visibleItems || []).map(normalize)
    };
};
const normalize = (data = {}) => ({
    ...data,
    organization: normalizeOrganization(data.organization),
    auditEvents: (data.auditEvents || []).map((event) => ({
        ...event,
        inquiryId: event.entity || '',
        dateKey: event.timestamp ? String(event.timestamp).slice(0, 10) : '',
        roomName: event.scope || '',
        details: event.details || ''
    }))
});

export const superAdminService = {
    async getAnalytics(scope = {}, trendFilter = {}, options = {}) {
        const response = await controlCenterApi.get({ ...scope, ...resolveDates(trendFilter) }, options);
        return normalize(response.data);
    },
    getScopeOptions(scope = {}, organization = {}) {
        const environments = organization.environments || [];
        const subEnvironments = (organization.subEnvironments || []).filter((item) => !scope.environmentId || item.environmentId === scope.environmentId || item.envId === scope.environmentId);
        const rooms = (organization.rooms || []).filter((item) => (!scope.environmentId || item.environmentId === scope.environmentId || item.envId === scope.environmentId) && (!scope.subEnvironmentId || item.subEnvironmentId === scope.subEnvironmentId));
        return { environments, subEnvironments, rooms };
    }
};