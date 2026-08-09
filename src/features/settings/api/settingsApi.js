import { authenticatedHttpClient } from '../../tickets/boards/api/authenticatedHttpClient.js';

const encode = encodeURIComponent;

export const createSettingsApi = (request = authenticatedHttpClient) => ({
    getRoomSettings(roomId, options = {}) {
        return request(`/api/settings/rooms/${encode(roomId)}`, { signal: options.signal });
    },
    saveRoomSettings(roomId, value, version, options = {}) {
        return request(`/api/settings/rooms/${encode(roomId)}`, {
            method: 'PUT',
            headers: { 'If-Match': `"${version}"` },
            body: { value },
            signal: options.signal
        });
    }
});

export const settingsApi = createSettingsApi();
