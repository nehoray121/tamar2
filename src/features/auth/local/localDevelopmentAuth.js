import { configureAccessTokenProvider } from '../../tickets/boards/api/authenticatedHttpClient.js';

let accessToken = '';

const isLoopbackHostname = (hostname) => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(hostname).toLowerCase());
const getTokenEndpoint = () => {
    const configured = String(import.meta.env.VITE_TAMAR_LOCAL_AUTH_URL || '').trim();
    let url;
    try { url = new URL('/token', configured); }
    catch { throw Object.assign(new Error('Local identity provider is unavailable'), { code: 'LOCAL_IDP_UNAVAILABLE' }); }
    if (url.protocol !== 'http:' || !isLoopbackHostname(url.hostname)) {
        throw Object.assign(new Error('Local identity provider is unavailable'), { code: 'LOCAL_IDP_UNAVAILABLE' });
    }
    return url.toString();
};
const provideAccessToken = async () => {
    if (!accessToken) throw Object.assign(new Error('Local login is required'), { code: 'AUTH_TOKEN_UNAVAILABLE' });
    return accessToken;
};

export const localDevelopmentAuth = Object.freeze({
    mode: 'local-personal-number',
    hasAccessToken: () => Boolean(accessToken),
    login: async (personalNumber) => {
        let response;
        try {
            response = await fetch(getTokenEndpoint(), {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ personalNumber })
            });
        } catch {
            throw Object.assign(new Error('Local identity provider is unavailable'), { code: 'LOCAL_IDP_UNAVAILABLE' });
        }
        let body = {};
        try { body = await response.json(); } catch {}
        if (!response.ok) {
            const code = response.status >= 500
                ? 'LOCAL_TOKEN_FAILED'
                : body?.error === 'INVALID_PERSONAL_NUMBER'
                    ? 'LOCAL_PERSONAL_NUMBER_INVALID'
                    : body?.error === 'RATE_LIMITED'
                        ? 'LOCAL_RATE_LIMITED'
                        : 'LOCAL_IDP_UNAVAILABLE';
            throw Object.assign(new Error('Local authentication failed'), { code, status: response.status });
        }
        if (typeof body.accessToken !== 'string' || !body.accessToken.trim()) {
            throw Object.assign(new Error('Local token response is invalid'), { code: 'LOCAL_TOKEN_FAILED' });
        }
        accessToken = body.accessToken.trim();
        configureAccessTokenProvider(provideAccessToken);
    },
    clear: () => {
        accessToken = '';
        configureAccessTokenProvider(null);
    }
});
