const dotenv = require('dotenv');

const ALLOWED_NODE_ENVIRONMENTS = new Set(['development', 'test', 'production']);
const ALLOWED_LOG_LEVELS = new Set(['error', 'warn', 'info', 'debug']);
const SAFE_ASYMMETRIC_ALGORITHMS = new Set(['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512']);
const AUTH_RUNTIME_MODES = Object.freeze({
    ORGANIZATIONAL_SSO: 'organizational-sso',
    LOCAL_PERSONAL_NUMBER: 'local-personal-number'
});
const DATABASE_BY_ENVIRONMENT = Object.freeze({
    development: 'tamar_dev',
    test: 'tamar_test',
    production: 'tamar'
});

const requireValue = (source, name) => {
    const value = String(source[name] ?? '').trim();
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
};
const optionalValue = (source, name, fallback = '') => String(source[name] ?? fallback).trim();
const parseInteger = (value, name, min, max) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be an integer between ${min} and ${max}`);
    return parsed;
};
const parsePort = (value) => parseInteger(value, 'PORT', 1, 65535);
const parseOrigins = (value) => {
    const rawOrigins = value.split(',');
    if (rawOrigins.some((origin) => !origin.trim())) throw new Error('CLIENT_ORIGINS must not contain empty entries');
    const origins = rawOrigins.map((origin) => {
        const trimmed = origin.trim();
        if (trimmed === '*') throw new Error('CLIENT_ORIGINS must not contain a wildcard');
        let parsed;
        try { parsed = new URL(trimmed); } catch { throw new Error(`CLIENT_ORIGINS contains an invalid origin: ${trimmed}`); }
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
            throw new Error(`CLIENT_ORIGINS contains an invalid origin: ${trimmed}`);
        }
        return parsed.origin;
    });
    return [...new Set(origins)];
};
const validateMongoUri = (value) => {
    if (!/^mongodb(?:\+srv)?:\/\//i.test(value)) throw new Error('MONGODB_URI must use mongodb:// or mongodb+srv://');
    return value;
};
const validateDatabaseName = (value, nodeEnv) => {
    const expected = DATABASE_BY_ENVIRONMENT[nodeEnv];
    if (value !== expected) throw new Error(`MONGODB_DATABASE must be ${expected} when NODE_ENV=${nodeEnv}`);
    return value;
};
const validateNodeEnvironment = (value) => {
    if (!ALLOWED_NODE_ENVIRONMENTS.has(value)) throw new Error('NODE_ENV must be development, test, or production');
    return value;
};
const validateLogLevel = (value) => {
    if (!ALLOWED_LOG_LEVELS.has(value)) throw new Error('LOG_LEVEL must be error, warn, info, or debug');
    return value;
};
const parseUrl = (value, name, nodeEnv) => {
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || (nodeEnv === 'production' && parsed.protocol !== 'https:')) throw new Error(`${name} must use HTTPS in production`);
    if (parsed.username || parsed.password || parsed.hash) throw new Error(`${name} must not contain credentials or a fragment`);
    return parsed.toString();
};
const isLoopbackHostname = (hostname) => ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(String(hostname).toLowerCase());
const assertLocalAuthUrl = (value, name) => {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' || !isLoopbackHostname(parsed.hostname)) {
        throw new Error(`${name} must use an HTTP loopback URL in local-personal-number mode`);
    }
};
const parseAlgorithms = (value) => {
    const algorithms = value.split(',').map((item) => item.trim()).filter(Boolean);
    if (!algorithms.length || new Set(algorithms).size !== algorithms.length) throw new Error('SSO_ALLOWED_ALGORITHMS must be a non-empty unique allowlist');
    const unsupported = algorithms.find((algorithm) => !SAFE_ASYMMETRIC_ALGORITHMS.has(algorithm));
    if (unsupported) throw new Error(`SSO_ALLOWED_ALGORITHMS contains an unsafe or unsupported algorithm: ${unsupported}`);
    return Object.freeze(algorithms);
};
const parseProviderKey = (value) => {
    const normalized = value.normalize('NFKC').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(normalized)) throw new Error('SSO_PROVIDER_KEY must be a stable normalized key');
    return normalized;
};
const parseClaimName = (value, name) => {
    if (!/^[A-Za-z0-9_.:/-]{1,128}$/.test(value) || ['__proto__', 'prototype', 'constructor'].includes(value)) throw new Error(`${name} contains an invalid claim name`);
    return value;
};
const parsePattern = (value) => {
    try { return new RegExp(value, 'u'); } catch { throw new Error('SSO_PERSONAL_NUMBER_PATTERN must be a valid JavaScript regular expression'); }
};
const parseHmacKey = (value) => {
    if (Buffer.byteLength(value, 'utf8') < 32) throw new Error('IDENTITY_LOOKUP_HMAC_KEY must contain at least 32 UTF-8 bytes');
    return value;
};
const parseRuntimeMode = (source, nodeEnv) => {
    const fallback = AUTH_RUNTIME_MODES.ORGANIZATIONAL_SSO;
    const mode = optionalValue(source, 'TAMAR_AUTH_MODE', fallback);
    if (!Object.values(AUTH_RUNTIME_MODES).includes(mode)) {
        throw new Error('TAMAR_AUTH_MODE must be organizational-sso or local-personal-number');
    }
    if (mode === AUTH_RUNTIME_MODES.LOCAL_PERSONAL_NUMBER && nodeEnv !== 'development') {
        throw new Error('local-personal-number authentication is allowed only when NODE_ENV=development');
    }
    return mode;
};

const loadEnvironment = ({ source = process.env, loadDotenv = true } = {}) => {
    if (loadDotenv) dotenv.config({ quiet: true });
    const nodeEnv = validateNodeEnvironment(requireValue(source, 'NODE_ENV'));
    const authMode = requireValue(source, 'AUTH_MODE');
    if (authMode !== 'access_token') throw new Error('AUTH_MODE must be access_token');
    const runtimeMode = parseRuntimeMode(source, nodeEnv);
    const emailClaim = optionalValue(source, 'SSO_EMAIL_CLAIM', 'email');
    const issuer = parseUrl(requireValue(source, 'SSO_ISSUER'), 'SSO_ISSUER', nodeEnv);
    const jwksUri = parseUrl(requireValue(source, 'SSO_JWKS_URI'), 'SSO_JWKS_URI', nodeEnv);
    if (runtimeMode === AUTH_RUNTIME_MODES.LOCAL_PERSONAL_NUMBER) {
        assertLocalAuthUrl(issuer, 'SSO_ISSUER');
        assertLocalAuthUrl(jwksUri, 'SSO_JWKS_URI');
    }
    return Object.freeze({
        nodeEnv,
        port: parsePort(requireValue(source, 'PORT')),
        clientOrigins: Object.freeze(parseOrigins(requireValue(source, 'CLIENT_ORIGINS'))),
        mongodbUri: validateMongoUri(requireValue(source, 'MONGODB_URI')),
        mongodbDatabase: validateDatabaseName(requireValue(source, 'MONGODB_DATABASE'), nodeEnv),
        logLevel: validateLogLevel(requireValue(source, 'LOG_LEVEL')),
        jsonBodyLimit: '256kb',
        shutdownTimeoutMs: 10000,
        auth: Object.freeze({
            mode: authMode,
            runtimeMode,
            issuer,
            audience: requireValue(source, 'SSO_AUDIENCE'),
            jwksUri,
            providerKey: parseProviderKey(requireValue(source, 'SSO_PROVIDER_KEY')),
            allowedAlgorithms: parseAlgorithms(requireValue(source, 'SSO_ALLOWED_ALGORITHMS')),
            subjectClaim: parseClaimName(optionalValue(source, 'SSO_SUBJECT_CLAIM', 'sub'), 'SSO_SUBJECT_CLAIM'),
            personalNumberClaim: parseClaimName(requireValue(source, 'SSO_PERSONAL_NUMBER_CLAIM'), 'SSO_PERSONAL_NUMBER_CLAIM'),
            displayNameClaim: parseClaimName(optionalValue(source, 'SSO_DISPLAY_NAME_CLAIM', 'name'), 'SSO_DISPLAY_NAME_CLAIM'),
            emailClaim: emailClaim ? parseClaimName(emailClaim, 'SSO_EMAIL_CLAIM') : null,
            clockToleranceSeconds: parseInteger(optionalValue(source, 'AUTH_CLOCK_TOLERANCE_SECONDS', '30'), 'AUTH_CLOCK_TOLERANCE_SECONDS', 0, 300),
            tokenMaxLength: parseInteger(optionalValue(source, 'AUTH_TOKEN_MAX_LENGTH', '16384'), 'AUTH_TOKEN_MAX_LENGTH', 512, 65536),
            personalNumberPattern: parsePattern(optionalValue(source, 'SSO_PERSONAL_NUMBER_PATTERN', '^[\p{L}\p{N}._/-]{1,128}$')),
            identityLookupHmacKey: parseHmacKey(requireValue(source, 'IDENTITY_LOOKUP_HMAC_KEY'))
        })
    });
};

module.exports = { AUTH_RUNTIME_MODES, DATABASE_BY_ENVIRONMENT, isLoopbackHostname, loadEnvironment, parseOrigins };
