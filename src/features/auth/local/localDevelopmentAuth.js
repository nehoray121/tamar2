import { configureAccessTokenProvider } from '../../tickets/boards/api/authenticatedHttpClient.js';

const STORAGE_KEY = 'tamar:local-persistent-session:v1';
let accessToken = '';

const isLoopbackHostname = (hostname) => [
    'localhost',
    '127.0.0.1',
    '::1',
    '[::1]'
].includes(String(hostname).toLowerCase());

const getProviderOrigin = () => {
    const configured = String(
        import.meta.env.VITE_TAMAR_LOCAL_AUTH_URL || ''
    ).trim();
    let url;
    try {
        url = new URL(configured);
    } catch {
        throw Object.assign(
            new Error('Local identity provider is unavailable'),
            { code: 'LOCAL_IDP_UNAVAILABLE' }
        );
    }
    if (
        url.protocol !== 'http:'
        || !isLoopbackHostname(url.hostname)
        || url.username
        || url.password
    ) {
        throw Object.assign(
            new Error('Local identity provider is unavailable'),
            { code: 'LOCAL_IDP_UNAVAILABLE' }
        );
    }
    return url.origin;
};

const readSessionToken = () => {
    try {
        return String(window.localStorage.getItem(STORAGE_KEY) || '').trim();
    } catch {
        return '';
    }
};

const storeSessionToken = (token) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, token);
    } catch {
        throw Object.assign(
            new Error('Local persistent session storage is unavailable'),
            { code: 'LOCAL_IDP_UNAVAILABLE' }
        );
    }
};

const clearStoredSession = () => {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
};

const requestSession = async (route, body) => {
    let response;
    try {
        response = await fetch(
            new URL(`/session/${route}`, getProviderOrigin()).toString(),
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );
    } catch {
        throw Object.assign(
            new Error('Local identity provider is unavailable'),
            { code: 'LOCAL_IDP_UNAVAILABLE' }
        );
    }

    let payload = {};
    try {
        payload = await response.json();
    } catch {}

    if (!response.ok) {
        const code = response.status >= 500
            ? 'LOCAL_TOKEN_FAILED'
            : payload?.error === 'INVALID_PERSONAL_NUMBER'
                ? 'LOCAL_PERSONAL_NUMBER_INVALID'
                : payload?.error === 'RATE_LIMITED'
                    ? 'LOCAL_RATE_LIMITED'
                    : payload?.error === 'LOCAL_SESSION_INVALID'
                        ? 'AUTH_TOKEN_UNAVAILABLE'
                        : 'LOCAL_IDP_UNAVAILABLE';
        throw Object.assign(
            new Error('Local authentication failed'),
            { code, status: response.status }
        );
    }

    return payload;
};

const installAccessToken = (payload) => {
    if (typeof payload?.accessToken !== 'string' || !payload.accessToken.trim()) {
        throw Object.assign(
            new Error('Local token response is invalid'),
            { code: 'LOCAL_TOKEN_FAILED' }
        );
    }
    accessToken = payload.accessToken.trim();
    configureAccessTokenProvider(provideAccessToken);
    return accessToken;
};

const refreshAccessToken = async () => {
    const sessionToken = readSessionToken();
    if (!sessionToken) {
        accessToken = '';
        configureAccessTokenProvider(null);
        throw Object.assign(
            new Error('Local login is required'),
            { code: 'AUTH_TOKEN_UNAVAILABLE' }
        );
    }

    try {
        return installAccessToken(
            await requestSession('refresh', { sessionToken })
        );
    } catch (error) {
        if (error?.code === 'AUTH_TOKEN_UNAVAILABLE') {
            clearStoredSession();
            accessToken = '';
            configureAccessTokenProvider(null);
        }
        throw error;
    }
};

// Deliberately refresh on every authenticated request. The local IDP is
// loopback-only, and this makes an IDP restart transparent while preserving
// short-lived bearer-token validation in the Tamar backend.
async function provideAccessToken() {
    return refreshAccessToken();
}

if (typeof window !== 'undefined' && readSessionToken()) {
    configureAccessTokenProvider(provideAccessToken);
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return;
        accessToken = '';
        if (event.newValue) {
            configureAccessTokenProvider(provideAccessToken);
        } else {
            configureAccessTokenProvider(null);
        }
    });
}

export const localDevelopmentAuth = Object.freeze({
    mode: 'local-personal-number',

    // A persistent local-session handle counts as an authenticated local
    // session even though the bearer itself stays short-lived and in memory.
    hasAccessToken: () => Boolean(accessToken || readSessionToken()),

    login: async (personalNumber) => {
        const payload = await requestSession('login', { personalNumber });
        if (
            typeof payload?.sessionToken !== 'string'
            || !payload.sessionToken.trim()
        ) {
            throw Object.assign(
                new Error('Local session response is invalid'),
                { code: 'LOCAL_TOKEN_FAILED' }
            );
        }
        storeSessionToken(payload.sessionToken.trim());
        installAccessToken(payload);
    },

    restore: async () => {
        if (!readSessionToken()) return false;
        try {
            await refreshAccessToken();
            return true;
        } catch {
            return false;
        }
    },

    logout: async () => {
        const sessionToken = readSessionToken();
        clearStoredSession();
        accessToken = '';
        configureAccessTokenProvider(null);
        if (!sessionToken) return;
        try {
            await requestSession('logout', { sessionToken });
        } catch {
            // Local logout remains effective in this browser even if the
            // loopback IDP is temporarily unavailable.
        }
    },

    clear: () => {
        clearStoredSession();
        accessToken = '';
        configureAccessTokenProvider(null);
    }
});
