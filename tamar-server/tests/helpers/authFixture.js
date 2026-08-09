const { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } = require('jose');
const AccessTokenVerifier = require('../../src/auth/AccessTokenVerifier.js');
const PersonalNumberService = require('../../src/auth/PersonalNumberService.js');

const ISSUER = 'https://sso.test.example/';
const AUDIENCE = 'api://tamar-test';
const HMAC_KEY = 'phase2b-test-hmac-key-with-more-than-32-bytes';
let keys;
let keyInitialization;

const createAuthConfig = (overrides = {}) => ({
    mode: 'access_token', issuer: ISSUER, audience: AUDIENCE, jwksUri: 'https://sso.test.example/jwks', providerKey: 'test-sso',
    allowedAlgorithms: ['RS256'], subjectClaim: 'sub', personalNumberClaim: 'personal_number', displayNameClaim: 'name', emailClaim: 'email',
    clockToleranceSeconds: 0, tokenMaxLength: 16384, personalNumberPattern: /^[0-9]{1,32}$/u, identityLookupHmacKey: HMAC_KEY,
    ...overrides
});

const initializeAuthKeys = async () => {
    if (keys) return keys;
    if (!keyInitialization) {
        keyInitialization = (async () => {
            const primary = await generateKeyPair('RS256', { extractable: true });
            const alternate = await generateKeyPair('RS256', { extractable: true });
            const publicJwk = await exportJWK(primary.publicKey);
            const alternateJwk = await exportJWK(alternate.publicKey);
            Object.assign(publicJwk, { kid: 'primary-test-key', use: 'sig', alg: 'RS256' });
            Object.assign(alternateJwk, { kid: 'alternate-test-key', use: 'sig', alg: 'RS256' });
            keys = { primary, alternate, jwks: { keys: [publicJwk] }, alternateJwks: { keys: [alternateJwk] } };
            return keys;
        })();
    }
    return keyInitialization;
};
const getAuthKeys = () => keys;
const createVerifier = (authConfig = createAuthConfig(), jwks = keys.jwks) => new AccessTokenVerifier({ authConfig, keyResolver: createLocalJWKSet(jwks) });
const signToken = async ({
    subject = 'subject-1', personalNumber = '1000001', displayName = 'Test User', email = 'test@example.com',
    issuer = ISSUER, audience = AUDIENCE, expiresIn = '5m', notBefore, algorithm = 'RS256', kid = 'primary-test-key',
    privateKey = keys.primary.privateKey, extraClaims = {}, omitSubject = false, omitPersonalNumber = false, omitDisplayName = false
} = {}) => {
    const claims = { ...extraClaims };
    if (!omitPersonalNumber) claims.personal_number = personalNumber;
    if (!omitDisplayName) claims.name = displayName;
    if (email !== undefined) claims.email = email;
    let jwt = new SignJWT(claims).setProtectedHeader({ alg: algorithm, kid }).setIssuer(issuer).setAudience(audience).setIssuedAt();
    if (!omitSubject) jwt = jwt.setSubject(subject);
    if (notBefore !== undefined) jwt = jwt.setNotBefore(notBefore);
    return jwt.setExpirationTime(expiresIn).sign(privateKey);
};
const createTestConfig = (auth = createAuthConfig()) => ({
    nodeEnv: 'test', port: 0, clientOrigins: ['http://localhost:5173'], mongodbUri: 'mongodb://127.0.0.1:27017/?replicaSet=rs0',
    mongodbDatabase: 'tamar_test', logLevel: 'error', jsonBodyLimit: '256kb', shutdownTimeoutMs: 10000, auth
});
const createPersonalNumberService = (auth = createAuthConfig()) => new PersonalNumberService({ hmacKey: auth.identityLookupHmacKey, pattern: auth.personalNumberPattern });

module.exports = { AUDIENCE, HMAC_KEY, ISSUER, createAuthConfig, createPersonalNumberService, createTestConfig, createVerifier, getAuthKeys, initializeAuthKeys, signToken };
