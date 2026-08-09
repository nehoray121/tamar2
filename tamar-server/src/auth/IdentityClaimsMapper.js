const { identityError } = require('./authenticationErrors.js');

const readClaim = (claims, name) => name.split('.').reduce((value, part) => (
    value && typeof value === 'object' ? value[part] : undefined
), claims);
const normalizeOptionalText = (value, maxLength) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).normalize('NFKC').trim();
    if (!normalized || normalized.length > maxLength || /[\u0000-\u001F\u007F]/u.test(normalized)) return undefined;
    return normalized;
};

class IdentityClaimsMapper {
    constructor({ authConfig, personalNumberService }) {
        this.config = authConfig;
        this.personalNumberService = personalNumberService;
    }

    mapVerifiedClaims(claims) {
        const subject = normalizeOptionalText(readClaim(claims, this.config.subjectClaim), 256);
        if (!subject) throw identityError('IDENTITY_CLAIMS_INVALID', 'The verified identity is missing a stable subject', 401);
        const rawPersonalNumber = readClaim(claims, this.config.personalNumberClaim);
        if (rawPersonalNumber === undefined || rawPersonalNumber === null || rawPersonalNumber === '') {
            throw identityError('PERSONAL_NUMBER_CLAIM_MISSING', 'The verified identity is missing the configured personal-number claim', 401);
        }
        const protectedNumber = this.personalNumberService.protect(rawPersonalNumber);
        const displayName = normalizeOptionalText(readClaim(claims, this.config.displayNameClaim), 200);
        if (!displayName) throw identityError('IDENTITY_CLAIMS_INVALID', 'The verified identity is missing the configured display-name claim', 401);
        const email = this.config.emailClaim ? normalizeOptionalText(readClaim(claims, this.config.emailClaim), 320)?.toLowerCase() : undefined;
        const issuedAt = Number(claims.iat);
        const expiresAt = Number(claims.exp);
        return Object.freeze({
            issuer: String(claims.iss),
            provider: this.config.providerKey,
            subject,
            personalNumberLookupHash: protectedNumber.lookupHash,
            personalNumberLast4: protectedNumber.last4,
            displayName,
            email,
            tokenIssuedAt: Number.isFinite(issuedAt) ? new Date(issuedAt * 1000) : undefined,
            tokenExpiresAt: Number.isFinite(expiresAt) ? new Date(expiresAt * 1000) : undefined
        });
    }
}

module.exports = IdentityClaimsMapper;
