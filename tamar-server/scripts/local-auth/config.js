const { isLoopbackHostname } = require('../../src/config/env.js');

const required = (source, name) => {
    const value = String(source[name] ?? '').trim();
    if (!value) throw new Error(`Missing required local-auth setting: ${name}`);
    return value;
};
const asUrl = (value, name) => {
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
    if (parsed.protocol !== 'http:' || !isLoopbackHostname(parsed.hostname)) {
        throw new Error(`${name} must be an HTTP loopback URL`);
    }
    return parsed;
};
const asInteger = (value, name, min, max) => {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return number;
};

const loadLocalAuthConfig = (source = process.env) => {
    const nodeEnv = required(source, 'NODE_ENV');
    const runtimeMode = required(source, 'TAMAR_AUTH_MODE');
    const database = required(source, 'MONGODB_DATABASE');
    if (nodeEnv !== 'development') throw new Error('Local identity provider requires NODE_ENV=development');
    if (runtimeMode !== 'local-personal-number') throw new Error('Local identity provider requires TAMAR_AUTH_MODE=local-personal-number');
    if (database !== 'tamar_dev') throw new Error('Local identity provider requires MONGODB_DATABASE=tamar_dev');

    const host = String(source.LOCAL_AUTH_HOST || '127.0.0.1').trim();
    if (!isLoopbackHostname(host)) throw new Error('Local identity provider may bind only to loopback');
    const port = asInteger(source.LOCAL_AUTH_PORT || '4100', 'LOCAL_AUTH_PORT', 1, 65535);
    const issuer = asUrl(source.LOCAL_AUTH_ISSUER || `http://127.0.0.1:${port}/`, 'LOCAL_AUTH_ISSUER');
    const clientOrigin = asUrl(source.LOCAL_AUTH_CLIENT_ORIGIN || 'http://127.0.0.1:5174', 'LOCAL_AUTH_CLIENT_ORIGIN');
    const tokenTtlSeconds = asInteger(source.LOCAL_AUTH_TOKEN_TTL_SECONDS || '900', 'LOCAL_AUTH_TOKEN_TTL_SECONDS', 60, 1800);

    return Object.freeze({
        host,
        port,
        issuer: issuer.toString(),
        audience: String(source.LOCAL_AUTH_AUDIENCE || 'api://tamar-local-development').trim(),
        clientOrigin: clientOrigin.origin,
        tokenTtlSeconds,
        personalNumberClaim: String(source.SSO_PERSONAL_NUMBER_CLAIM || 'personal_number').trim(),
        displayNameClaim: String(source.SSO_DISPLAY_NAME_CLAIM || 'name').trim(),
        providerKey: String(source.SSO_PROVIDER_KEY || 'local-development').trim()
    });
};

module.exports = { loadLocalAuthConfig };
