const { createHmac, timingSafeEqual } = require('node:crypto');
const AppError = require('../errors/AppError.js');

const invalidPersonalNumber = () => new AppError({
    statusCode: 401,
    code: 'IDENTITY_CLAIMS_INVALID',
    message: 'The verified personal-number claim is invalid'
});

class PersonalNumberService {
    constructor({ hmacKey, pattern }) {
        this.hmacKey = hmacKey;
        this.pattern = pattern;
    }

    normalize(value) {
        let text;
        if (typeof value === 'string') text = value;
        else if (typeof value === 'number' && Number.isSafeInteger(value)) text = String(value);
        else throw invalidPersonalNumber();
        const normalized = text.normalize('NFKC').trim();
        if (!normalized || normalized.length > 128 || /[\u0000-\u001F\u007F]/u.test(normalized)) throw invalidPersonalNumber();
        this.pattern.lastIndex = 0;
        if (!this.pattern.test(normalized)) throw invalidPersonalNumber();
        return normalized;
    }

    computeLookupHash(normalizedPersonalNumber) {
        return createHmac('sha256', this.hmacKey).update(normalizedPersonalNumber, 'utf8').digest('hex');
    }

    protect(value) {
        const normalized = this.normalize(value);
        return {
            lookupHash: this.computeLookupHash(normalized),
            last4: [...normalized].slice(-4).join('')
        };
    }

    mask(last4) {
        return last4 ? `***${last4}` : undefined;
    }

    safeEqual(left, right) {
        if (typeof left !== 'string' || typeof right !== 'string') return false;
        const leftBuffer = Buffer.from(left);
        const rightBuffer = Buffer.from(right);
        return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
    }

    identityRoom(auth) {
        const digest = createHmac('sha256', this.hmacKey)
            .update(`${auth.provider}\u0000${auth.subject}`, 'utf8')
            .digest('base64url');
        return `identity:${digest}`;
    }
}

module.exports = PersonalNumberService;
