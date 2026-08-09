import { authenticatedHttpClient } from '../../tickets/boards/api/authenticatedHttpClient.js';

const withQuery = (path, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    return query.size ? `${path}?${query}` : path;
};

export const createControlCenterApi = (request = authenticatedHttpClient) => ({
    get(params, options = {}) {
        return request(withQuery('/api/control-center', params), { signal: options.signal });
    }
});

export const controlCenterApi = createControlCenterApi();