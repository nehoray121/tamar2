const assert = require('node:assert/strict');
const { before, test } = require('node:test');
const IdentityClaimsMapper = require('../src/auth/IdentityClaimsMapper.js');
const PersonalNumberService = require('../src/auth/PersonalNumberService.js');
const User = require('../src/models/User.js');
const AccessRequest = require('../src/models/AccessRequest.js');
const { createAuthConfig, createPersonalNumberService, createVerifier, getAuthKeys, initializeAuthKeys, signToken } = require('./helpers/authFixture.js');

let config;
let verifier;
let mapper;
before(async () => {
    await initializeAuthKeys();
    config = createAuthConfig();
    verifier = createVerifier(config);
    mapper = new IdentityClaimsMapper({ authConfig: config, personalNumberService: createPersonalNumberService(config) });
});
const expectAuthFailure = async (operation) => assert.rejects(operation, (error) => error.statusCode === 401);
const request = (authorization, rawHeaders = authorization === undefined ? [] : ['Authorization', authorization]) => ({ headers: authorization === undefined ? {} : { authorization }, rawHeaders });

test('missing Authorization header is rejected', () => assert.throws(() => verifier.extractFromHttpRequest(request()), (error) => error.code === 'AUTHENTICATION_REQUIRED'));
test('non-Bearer Authorization scheme is rejected', () => assert.throws(() => verifier.extractFromHttpRequest(request('Basic abc')), (error) => error.code === 'INVALID_ACCESS_TOKEN'));
test('empty Bearer token is rejected', () => assert.throws(() => verifier.extractFromHttpRequest(request('Bearer ')), (error) => error.code === 'INVALID_ACCESS_TOKEN'));
test('oversized Bearer token is rejected', () => assert.throws(() => verifier.extractFromHttpRequest(request(`Bearer ${'a'.repeat(config.tokenMaxLength + 1)}`)), (error) => error.code === 'INVALID_ACCESS_TOKEN'));
test('multiple Authorization values are rejected', () => assert.throws(() => verifier.extractFromHttpRequest(request('Bearer abc', ['Authorization', 'Bearer abc', 'Authorization', 'Bearer def'])), (error) => error.code === 'INVALID_ACCESS_TOKEN'));
test('malformed JWT is rejected', () => expectAuthFailure(() => verifier.verify('not-a-jwt')));
test('invalid JWT signature is rejected', async () => { const token = await signToken({ privateKey: getAuthKeys().alternate.privateKey }); await expectAuthFailure(() => verifier.verify(token)); });
test('unknown JWKS key ID is rejected', async () => { const token = await signToken({ kid: 'missing-key' }); await expectAuthFailure(() => verifier.verify(token)); });
test('wrong token issuer is rejected', async () => { const token = await signToken({ issuer: 'https://other.example/' }); await expectAuthFailure(() => verifier.verify(token)); });
test('wrong token audience is rejected', async () => { const token = await signToken({ audience: 'api://other' }); await expectAuthFailure(() => verifier.verify(token)); });
test('expired token is rejected', async () => { const token = await signToken({ expiresIn: Math.floor(Date.now() / 1000) - 30 }); await expectAuthFailure(() => verifier.verify(token)); });
test('future not-before outside tolerance is rejected', async () => { const token = await signToken({ notBefore: Math.floor(Date.now() / 1000) + 120 }); await expectAuthFailure(() => verifier.verify(token)); });
test('alg none token is rejected', async () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    await expectAuthFailure(() => verifier.verify(`${encode({ alg: 'none', kid: 'none' })}.${encode({ iss: config.issuer, aud: config.audience, exp: 9999999999 })}.`));
});
test('disallowed asymmetric algorithm is rejected', async () => {
    const token = await signToken();
    const parts = token.split('.');
    parts[0] = Buffer.from(JSON.stringify({ alg: 'ES256', kid: 'primary-test-key' })).toString('base64url');
    await expectAuthFailure(() => verifier.verify(parts.join('.')));
});
test('missing subject claim is rejected by claim mapping', async () => {
    const { claims } = await verifier.verify(await signToken({ omitSubject: true }));
    assert.throws(() => mapper.mapVerifiedClaims(claims), (error) => error.code === 'IDENTITY_CLAIMS_INVALID');
});
test('missing personal-number claim is rejected', async () => {
    const { claims } = await verifier.verify(await signToken({ omitPersonalNumber: true }));
    assert.throws(() => mapper.mapVerifiedClaims(claims), (error) => error.code === 'PERSONAL_NUMBER_CLAIM_MISSING');
});
test('missing display-name claim is rejected', async () => {
    const { claims } = await verifier.verify(await signToken({ omitDisplayName: true }));
    assert.throws(() => mapper.mapVerifiedClaims(claims), (error) => error.code === 'IDENTITY_CLAIMS_INVALID');
});
test('invalid personal-number format is rejected', async () => {
    const { claims } = await verifier.verify(await signToken({ personalNumber: 'ABC-123' }));
    assert.throws(() => mapper.mapVerifiedClaims(claims), (error) => error.code === 'IDENTITY_CLAIMS_INVALID');
});
test('valid signed Access Token maps to safe auth context', async () => {
    const token = await signToken();
    const { claims } = await verifier.verify(token);
    const auth = mapper.mapVerifiedClaims(claims);
    assert.equal(auth.subject, 'subject-1');
    assert.match(auth.personalNumberLookupHash, /^[a-f0-9]{64}$/);
    assert.equal('personalNumber' in auth, false);
    assert.equal('accessToken' in auth, false);
});
test('token role claim grants no Tamar role in auth context', async () => {
    const { claims } = await verifier.verify(await signToken({ extraClaims: { role: 'SUPER_ADMIN', groups: ['admins'] } }));
    const auth = mapper.mapVerifiedClaims(claims);
    assert.equal('role' in auth, false);
    assert.equal('groups' in auth, false);
});
test('HMAC output is deterministic for normalized personal number', () => {
    const service = createPersonalNumberService();
    assert.equal(service.protect(' 1000001 ').lookupHash, service.protect('1000001').lookupHash);
});
test('different personal numbers produce different HMAC hashes', () => {
    const service = createPersonalNumberService();
    assert.notEqual(service.protect('1000001').lookupHash, service.protect('1000002').lookupHash);
});
test('different HMAC keys produce different hashes', () => {
    const left = createPersonalNumberService();
    const right = new PersonalNumberService({ hmacKey: 'a-different-test-hmac-key-with-32-bytes', pattern: /^[0-9]+$/u });
    assert.notEqual(left.protect('1000001').lookupHash, right.protect('1000001').lookupHash);
});
test('integer personal-number claim is converted safely', () => assert.equal(createPersonalNumberService().normalize(123456), '123456'));
test('unsafe numeric personal-number claim is rejected', () => assert.throws(() => createPersonalNumberService().normalize(Number.MAX_VALUE)));
test('control characters in personal number are rejected', () => assert.throws(() => createPersonalNumberService().normalize('123\n456')));
test('User schema contains no plaintext identity or password field', () => {
    for (const field of ['identityNumber', 'personalNumber', 'password', 'passwordHash']) assert.equal(User.schema.path(field), undefined);
});
test('AccessRequest schema contains no plaintext personal-number field', () => {
    assert.equal(AccessRequest.schema.path('requesterIdentitySnapshot.identityNumber'), undefined);
    assert.equal(AccessRequest.schema.path('requesterIdentitySnapshot.personalNumber'), undefined);
});
test('protected identity metadata is excluded by normal User projection', () => {
    assert.equal(User.schema.path('personalNumberLookupHash').options.select, false);
    assert.equal(User.schema.path('personalNumberLast4').options.select, false);
});
test('protected identity metadata is excluded by normal AccessRequest projection', () => {
    assert.equal(AccessRequest.schema.path('requesterIdentitySnapshot.personalNumberLookupHash').options.select, false);
    assert.equal(AccessRequest.schema.path('requesterIdentitySnapshot.personalNumberLast4').options.select, false);
});
