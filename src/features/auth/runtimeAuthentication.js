import { configureAccessTokenProvider } from '../tickets/boards/api/authenticatedHttpClient.js';

const isLoopbackHostname = (hostname) => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(hostname).toLowerCase());

let runtimePromise;

export const isExplicitLocalDevelopmentMode = () => (
    typeof window !== 'undefined'
    && import.meta.env.DEV
    && import.meta.env.VITE_TAMAR_LOCAL_PERSONAL_NUMBER_LOGIN === 'true'
    && isLoopbackHostname(window.location.hostname)
);

export const getRuntimeAuthentication = () => {
    if (import.meta.env.DEV && isExplicitLocalDevelopmentMode()) {
        runtimePromise ??= import('./local/localDevelopmentAuth.js')
            .then((module) => module.localDevelopmentAuth);
        return runtimePromise;
    }

    runtimePromise ??= Promise.resolve(Object.freeze({
        mode: 'organizational-sso',
        hasAccessToken: () => true,
        clear: () => configureAccessTokenProvider(null)
    }));
    return runtimePromise;
};

export const loadLocalAuthenticationUi = () => {
    if (!import.meta.env.DEV || !isExplicitLocalDevelopmentMode()) return Promise.resolve(null);
    return import('./local/LocalDevelopmentAuthUi.jsx');
};
