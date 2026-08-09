import { authenticatedHttpClient } from '../../tickets/boards/api/authenticatedHttpClient.js';

const toQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') query.set(key, String(value));
    });
    const encoded = query.toString();
    return encoded ? `?${encoded}` : '';
};

export const createDashboardApi = (request = authenticatedHttpClient) => ({
    getDashboard(params, options = {}) {
        return request(`/api/dashboard${toQuery(params)}`, { signal: options.signal });
    }
});

export const dashboardApi = createDashboardApi();