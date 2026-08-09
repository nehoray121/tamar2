const buildIdentitySnapshot = ({ provider, subject, personalNumberLookupHash, personalNumberLast4, displayName, email }) => ({
    provider,
    subject,
    personalNumberLookupHash,
    personalNumberLast4,
    displayName,
    email
});

module.exports = { buildIdentitySnapshot };
