import { notifyError } from '../../../notifications/notificationBus.js';
import { BoardApiError, toBoardApiError } from './boardApiErrors.js';

let configuredTokenProvider = null;

export const configureAccessTokenProvider = (provider) => {
    if (provider !== null && typeof provider !== 'function') throw new TypeError('Access Token provider must be a function');
    configuredTokenProvider = provider;
};

export const getAccessToken = async () => {
    const runtimeProvider = globalThis.__TAMAR_AUTH__?.getAccessToken;
    const provider = configuredTokenProvider || (typeof runtimeProvider === 'function' ? runtimeProvider.bind(globalThis.__TAMAR_AUTH__) : null);
    if (!provider) throw new BoardApiError({ code: 'AUTH_TOKEN_UNAVAILABLE', message: 'לא נמצא Access Token ארגוני פעיל. יש להתחבר מחדש למערכת.' });
    const token = await provider();
    if (typeof token !== 'string' || !token.trim()) {
        throw new BoardApiError({ code: 'AUTH_TOKEN_UNAVAILABLE', message: 'לא נמצא Access Token ארגוני פעיל. יש להתחבר מחדש למערכת.' });
    }
    return token.trim();
};

const defaultBaseUrl = String(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/u, '');

export const createAuthenticatedHttpClient = ({
    baseUrl = defaultBaseUrl,
    fetchImpl = globalThis.fetch,
    tokenProvider = getAccessToken
} = {}) => async (path, { method = 'GET', body, headers = {}, signal } = {}) => {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
    const token = await tokenProvider();
    if (typeof token !== 'string' || !token.trim()) {
        throw new BoardApiError({ code: 'AUTH_TOKEN_UNAVAILABLE', message: 'לא נמצא Access Token ארגוני פעיל. יש להתחבר מחדש למערכת.' });
    }
    let response;
    try {
        response = await fetchImpl(`${String(baseUrl).replace(/\/$/u, '')}${path}`, {
            method,
            signal,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token.trim()}`,
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                ...headers
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
    } catch (cause) {
        if (cause?.name === 'AbortError') throw cause;
        const error = toBoardApiError({ cause });
        notifyError(error?.message || 'לא ניתן להשלים את הבקשה');
        throw error;
    }

    const text = await response.text();
    let payload = null;
    if (text) {
        try { payload = JSON.parse(text); }
        catch { payload = null; }
    }
    if (!response.ok || payload?.success === false) {
        const error = toBoardApiError({ response, body: payload });
        notifyError(error?.message || 'לא ניתן להשלים את הבקשה');
        throw error;
    }
    return {
        status: response.status,
        data: payload?.data,
        etag: response.headers.get('etag'),
        requestId: response.headers.get('x-request-id')
    };
};

export const authenticatedHttpClient = createAuthenticatedHttpClient();
