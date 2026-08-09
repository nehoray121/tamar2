const { createHmac } = require('node:crypto');
const TEST_HMAC_KEY = 'test-only-phase2b-hmac-key-at-least-32-bytes';
const lookupHashFor = (personalNumber) => createHmac('sha256', TEST_HMAC_KEY).update(String(personalNumber)).digest('hex');
const protectedIdentity = (subject, { provider = 'test-provider', personalNumber = subject, displayName = `Test ${subject}`, email } = {}) => ({
    externalIdentity: { provider, subject },
    personalNumberLookupHash: lookupHashFor(personalNumber),
    personalNumberLast4: String(personalNumber).slice(-4),
    displayName,
    ...(email ? { email } : {})
});
const identitySnapshot = (user) => ({
    provider: user.externalIdentity.provider,
    subject: user.externalIdentity.subject,
    personalNumberLookupHash: user.personalNumberLookupHash,
    personalNumberLast4: user.personalNumberLast4,
    displayName: user.displayName,
    email: user.email
});

module.exports = { TEST_HMAC_KEY, identitySnapshot, lookupHashFor, protectedIdentity };
