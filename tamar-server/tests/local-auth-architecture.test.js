const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const list = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? list(target) : [target];
});

test('no personal-number or local-login route exists in the Tamar API registry', () => {
    const routeSource = list(path.join(root, 'src', 'routes'))
        .filter((file) => file.endsWith('.js'))
        .map((file) => fs.readFileSync(file, 'utf8'))
        .join('\n')
        .toLowerCase();
    for (const marker of ['personal-number', 'personal_number', 'dev-login', 'local-login', "router.post('/token'"]) {
        assert.equal(routeSource.includes(marker), false, marker);
    }
});

test('local authentication tooling remains CommonJS, loopback guarded and outside src/routes', () => {
    const source = [
        read('scripts/local-auth/config.js'),
        read('scripts/local-auth/server.js'),
        read('scripts/local-auth/seed.js')
    ].join('\n');
    assert.match(source, /127\.0\.0\.1/);
    assert.match(source, /tamar_dev/);
    assert.match(source, /NODE_ENV=development/);
    assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);
    assert.doesNotMatch(source, /BEGIN (?:RSA )?PRIVATE KEY/);
});

test('local tokens and personal numbers are not persisted by backend tooling', () => {
    const source = [
        read('scripts/local-auth/server.js'),
        read('scripts/local-auth/seed.js')
    ].join('\n');
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i);
    const logLines = source.split(/\r?\n/).filter((line) => /console\.(?:log|error)/.test(line));
    assert.equal(logLines.some((line) => /accessToken|personalNumber/.test(line)), false);
});

test('seed and test cleanup target only their approved databases', () => {
    const seed = read('scripts/local-auth/seed.js');
    const tests = read('tests/helpers/testDatabase.js');
    assert.match(seed, /MONGODB_DATABASE.*tamar_dev/);
    assert.match(seed, /databaseName !== 'tamar_dev'/);
    assert.match(tests, /TEST_DATABASE_NAME = 'tamar_test'/);
    assert.doesNotMatch(tests, /tamar_dev/);
});


test('requested seven-digit SUPER_ADMIN seed remains unique, HMAC-protected and idempotent by active membership key', () => {
    const fixtures = read('scripts/local-auth/fixtures.js');
    const identity = read('scripts/local-auth/identity.js');
    const seed = read('scripts/local-auth/seed.js');
    const userModel = read('src/models/User.js');
    const membershipModel = read('src/models/OrganizationMembership.js');
    assert.equal((fixtures.match(/1234567/g) || []).length, 1);
    assert.match(identity, /\[0-9\]\{7\}/);
    assert.match(seed, /PersonalNumberService/);
    assert.match(seed, /personalNumberLookupHash: protection\.lookupHash/);
    assert.match(seed, /findOneAndUpdate/);
    assert.match(userModel, /uniq_user_personal_number_lookup/);
    assert.match(membershipModel, /uniq_active_membership/);
    assert.doesNotMatch(seed, /personalNumber\s*:/);
});
