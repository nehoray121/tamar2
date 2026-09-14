const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { importJWK, jwtVerify } = require('jose');
const { AUTH_RUNTIME_MODES, loadEnvironment } = require('../src/config/env.js');
const { createLocalIdentityProvider } = require('../scripts/local-auth/server.js');
const { createDevelopmentSubject, normalizeDevelopmentPersonalNumber } = require('../scripts/local-auth/identity.js');
const { loadLocalAuthConfig } = require('../scripts/local-auth/config.js');

const localSource = (overrides = {}) => ({
    NODE_ENV: 'development',
    TAMAR_AUTH_MODE: 'local-personal-number',
    MONGODB_DATABASE: 'tamar_dev',
    LOCAL_AUTH_HOST: '127.0.0.1',
    LOCAL_AUTH_PORT: '4100',
    LOCAL_AUTH_ISSUER: 'http://127.0.0.1:4100/',
    LOCAL_AUTH_AUDIENCE: 'api://tamar-local-development',
    LOCAL_AUTH_CLIENT_ORIGIN: 'http://127.0.0.1:5174',
    LOCAL_AUTH_TOKEN_TTL_SECONDS: '120',
    SSO_PERSONAL_NUMBER_CLAIM: 'personal_number',
    SSO_DISPLAY_NAME_CLAIM: 'name',
    SSO_PROVIDER_KEY: 'local-development',
    ...overrides
});
const backendSource = (overrides = {}) => ({
    NODE_ENV: 'development',
    PORT: '4000',
    CLIENT_ORIGINS: 'http://127.0.0.1:5174',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/?replicaSet=rs0',
    MONGODB_DATABASE: 'tamar_dev',
    LOG_LEVEL: 'info',
    AUTH_MODE: 'access_token',
    TAMAR_AUTH_MODE: AUTH_RUNTIME_MODES.LOCAL_PERSONAL_NUMBER,
    SSO_ISSUER: 'http://127.0.0.1:4100/',
    SSO_AUDIENCE: 'api://tamar-local-development',
    SSO_JWKS_URI: 'http://127.0.0.1:4100/.well-known/jwks.json',
    SSO_PROVIDER_KEY: 'local-development',
    SSO_ALLOWED_ALGORITHMS: 'RS256',
    SSO_SUBJECT_CLAIM: 'sub',
    SSO_PERSONAL_NUMBER_CLAIM: 'personal_number',
    SSO_DISPLAY_NAME_CLAIM: 'name',
    SSO_EMAIL_CLAIM: '',
    SSO_PERSONAL_NUMBER_PATTERN: '^(?:[0-9]{7}|[0-9]{9})$',
    IDENTITY_LOOKUP_HMAC_KEY: 'local-auth-test-hmac-key-with-at-least-32-bytes',
    ...overrides
});

test('local identity normalization accepts approved seven- and nine-digit synthetic identifiers only', () => {
    assert.equal(normalizeDevelopmentPersonalNumber(' 1234567 '), '1234567');
    assert.equal(normalizeDevelopmentPersonalNumber(' 990000001 '), '990000001');
    assert.equal(normalizeDevelopmentPersonalNumber('123456'), null);
    assert.equal(normalizeDevelopmentPersonalNumber('12345678'), null);
    assert.equal(normalizeDevelopmentPersonalNumber('12345A7'), null);
    assert.equal(createDevelopmentSubject('1234567'), createDevelopmentSubject('1234567'));
    assert.notEqual(createDevelopmentSubject('1234567'), createDevelopmentSubject('990000001'));
});

test('local identity provider refuses production, non-development databases and external binding', () => {
    assert.throws(() => loadLocalAuthConfig(localSource({ NODE_ENV: 'production' })), /NODE_ENV=development/);
    assert.throws(() => loadLocalAuthConfig(localSource({ MONGODB_DATABASE: 'tamar' })), /tamar_dev/);
    assert.throws(() => loadLocalAuthConfig(localSource({ MONGODB_DATABASE: 'admin' })), /tamar_dev/);
    assert.throws(() => loadLocalAuthConfig(localSource({ LOCAL_AUTH_HOST: '0.0.0.0' })), /loopback/);
    assert.throws(() => loadLocalAuthConfig(localSource({ TAMAR_AUTH_MODE: 'organizational-sso' })), /local-personal-number/);
});

test('backend database and issuer guards hard-separate development, test and production', () => {
    assert.equal(loadEnvironment({ source: backendSource(), loadDotenv: false }).mongodbDatabase, 'tamar_dev');
    assert.throws(() => loadEnvironment({ source: backendSource({ MONGODB_DATABASE: 'tamar' }), loadDotenv: false }), /tamar_dev/);
    assert.throws(() => loadEnvironment({ source: backendSource({ NODE_ENV: 'test', MONGODB_DATABASE: 'tamar_dev', TAMAR_AUTH_MODE: 'organizational-sso' }), loadDotenv: false }), /tamar_test/);
    assert.throws(() => loadEnvironment({ source: backendSource({ NODE_ENV: 'production', MONGODB_DATABASE: 'tamar', TAMAR_AUTH_MODE: 'local-personal-number', SSO_ISSUER: 'https://identity.example.invalid/', SSO_JWKS_URI: 'https://identity.example.invalid/jwks' }), loadDotenv: false }), /allowed only/);
    assert.throws(() => loadEnvironment({ source: backendSource({ SSO_ISSUER: 'https://identity.example.invalid/', SSO_JWKS_URI: 'https://identity.example.invalid/jwks' }), loadDotenv: false }), /loopback/);
});

let provider;
let origin;
before(async () => {
    provider = await createLocalIdentityProvider({ source: localSource() });
    await new Promise((resolve, reject) => {
        provider.server.once('error', reject);
        provider.server.listen(0, '127.0.0.1', resolve);
    });
    origin = 'http://127.0.0.1:' + provider.server.address().port;
});
after(async () => {
    if (provider?.server?.listening) await new Promise((resolve) => provider.server.close(resolve));
});

test('local provider publishes public JWKS only', async () => {
    const response = await fetch(origin + '/.well-known/jwks.json');
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.keys.length, 1);
    assert.equal(body.keys[0].kty, 'RSA');
    assert.equal(body.keys[0].alg, 'RS256');
    assert.equal('d' in body.keys[0], false);
});

test('local provider issues a short-lived signed identity-only Access Token', async () => {
    const response = await fetch(origin + '/token', {
        method: 'POST',
        headers: { Origin: 'http://127.0.0.1:5174', 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalNumber: '1234567' })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.expiresIn, 120);
    const publicKey = await importJWK(provider.publicJwk, 'RS256');
    const verified = await jwtVerify(body.accessToken, publicKey, {
        issuer: 'http://127.0.0.1:4100/',
        audience: 'api://tamar-local-development',
        algorithms: ['RS256']
    });
    assert.equal(verified.payload.personal_number, '1234567');
    assert.equal(verified.payload.sub, createDevelopmentSubject('1234567'));
    assert.ok(verified.payload.exp - verified.payload.iat <= 120);
    for (const forbidden of ['role', 'roles', 'memberships', 'roomId', 'scope']) {
        assert.equal(forbidden in verified.payload, false);
    }
});

test('local token endpoint rejects invalid input, extra authority fields and non-approved origins', async () => {
    const invalid = await fetch(origin + '/token', {
        method: 'POST',
        headers: { Origin: 'http://127.0.0.1:5174', 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalNumber: 'not-valid' })
    });
    assert.equal(invalid.status, 400);
    const authority = await fetch(origin + '/token', {
        method: 'POST',
        headers: { Origin: 'http://127.0.0.1:5174', 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalNumber: '1234567', role: 'SUPER_ADMIN' })
    });
    assert.equal(authority.status, 400);
    const external = await fetch(origin + '/token', {
        method: 'POST',
        headers: { Origin: 'https://external.example.invalid', 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalNumber: '990000001' })
    });
    assert.equal(external.status, 403);
});
