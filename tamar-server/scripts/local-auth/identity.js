const { createHash } = require('node:crypto');

const DEVELOPMENT_PERSONAL_NUMBER_PATTERN = /^(?:[0-9]{7}|[0-9]{9})$/;
const PERSONAL_NUMBER_PATTERN = DEVELOPMENT_PERSONAL_NUMBER_PATTERN;

const normalizeDevelopmentPersonalNumber = (value) => {
    if (typeof value !== 'string') return null;
    const normalized = value.normalize('NFKC').trim();
    return PERSONAL_NUMBER_PATTERN.test(normalized) ? normalized : null;
};

const createDevelopmentSubject = (personalNumber) => {
    const normalized = normalizeDevelopmentPersonalNumber(personalNumber);
    if (!normalized) throw new TypeError('A seven- or nine-digit synthetic development personal number is required');
    return `local-${createHash('sha256').update(normalized, 'utf8').digest('base64url')}`;
};

module.exports = { DEVELOPMENT_PERSONAL_NUMBER_PATTERN, PERSONAL_NUMBER_PATTERN, createDevelopmentSubject, normalizeDevelopmentPersonalNumber };
