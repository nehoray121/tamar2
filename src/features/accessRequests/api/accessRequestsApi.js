import { authenticatedHttpClient } from '../../tickets/boards/api/authenticatedHttpClient.js';

const encode = encodeURIComponent;
const withQuery = (path, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    return query.size ? `${path}?${query.toString()}` : path;
};

export const createAccessRequestsApi = (request = authenticatedHttpClient) => ({
    options(params = {}, options = {}) {
        return request(withQuery('/api/access-request-options', params), { signal: options.signal });
    },
    listMine(options = {}) {
        return request('/api/access-requests/me', { signal: options.signal });
    },
    listReviewable(params = {}, options = {}) {
        return request(withQuery('/api/access-requests', params), { signal: options.signal });
    },
    create(input, options = {}) {
        return request('/api/access-requests', { method: 'POST', body: input, signal: options.signal });
    },
    approve(requestId, input, options = {}) {
        return request(`/api/access-requests/${encode(requestId)}/approve`, {
            method: 'POST',
            body: input,
            signal: options.signal
        });
    },
    reject(requestId, reviewComment = '', options = {}) {
        return request(`/api/access-requests/${encode(requestId)}/reject`, {
            method: 'POST',
            body: { reviewComment },
            signal: options.signal
        });
    },
    cancel(requestId, options = {}) {
        return request(`/api/access-requests/${encode(requestId)}/cancel`, {
            method: 'POST',
            body: {},
            signal: options.signal
        });
    }
});

export const accessRequestsApi = createAccessRequestsApi();
