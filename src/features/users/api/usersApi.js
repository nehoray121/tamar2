import { authenticatedHttpClient } from '../../tickets/boards/api/authenticatedHttpClient.js';
const encode = encodeURIComponent;
const withQuery = (path, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') query.set(key, String(value));
    });
    return query.size ? `${path}?${query}` : path;
};
export const createUsersApi = (request = authenticatedHttpClient) => ({
    list(params, options = {}) { return request(withQuery('/api/users', params), { signal: options.signal }); },
    options(options = {}) { return request('/api/users/options', { signal: options.signal }); },
    get(id, options = {}) { return request(`/api/users/${encode(id)}`, { signal: options.signal }); },
    create(input, options = {}) { return request('/api/users', { method: 'POST', body: input, signal: options.signal }); },
    update(id, input, version, options = {}) { return request(`/api/users/${encode(id)}`, { method: 'PATCH', body: input, headers: { 'If-Match': `"${version}"` }, signal: options.signal }); },
    addMembership(id, input, options = {}) { return request(`/api/users/${encode(id)}/memberships`, { method: 'POST', body: input, signal: options.signal }); },
    removeMembership(id, membershipId, reason = 'הוסר דרך ניהול משתמשים', options = {}) { return request(`/api/users/${encode(id)}/memberships/${encode(membershipId)}`, { method: 'DELETE', body: { reason }, signal: options.signal }); }
});
export const usersApi = createUsersApi();