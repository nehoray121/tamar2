const AppError = require('../../errors/AppError.js');
class IdentityRequestThrottle {
    constructor({ limit = 10, windowMs = 3600000 } = {}) { this.limit = limit; this.windowMs = windowMs; this.entries = new Map(); }
    assertAllowed(identityHash) {
        const now = Date.now();
        const current = this.entries.get(identityHash);
        if (!current || current.resetAt <= now) { this.entries.set(identityHash, { count: 1, resetAt: now + this.windowMs }); return; }
        if (current.count >= this.limit) throw new AppError({ statusCode: 429, code: 'ACCESS_REQUEST_RATE_LIMITED', message: 'Too many Access Requests were submitted. Please try again later.' });
        current.count += 1;
    }
}

module.exports = IdentityRequestThrottle;
