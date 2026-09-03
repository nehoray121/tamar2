const { authenticationError } = require('./authenticationErrors.js');

let josePromise = null;
const loadJose = () => {
    josePromise ||= import('jose');
    return josePromise;
};

const extractBearerToken = ({ headers = {}, rawHeaders = [] }, maxLength) => {
    const authorizationCount = rawHeaders.reduce((count, value, index) => (
        index % 2 === 0 && String(value).toLowerCase() === 'authorization' ? count + 1 : count
    ), 0);
    if (authorizationCount > 1 || Array.isArray(headers.authorization)) throw authenticationError('INVALID_ACCESS_TOKEN', null, 'multiple_authorization_headers');
    const header = headers.authorization;
    if (!header) throw authenticationError('AUTHENTICATION_REQUIRED', null, 'missing_authorization');
    if (typeof header !== 'string' || !/^Bearer [^\s]+$/.test(header)) throw authenticationError('INVALID_ACCESS_TOKEN', null, 'malformed_authorization');
    const token = header.slice(7);
    if (!token || token.length > maxLength) throw authenticationError('INVALID_ACCESS_TOKEN', null, token ? 'oversized_token' : 'empty_token');
    return token;
};

class AccessTokenVerifier {
    constructor({
        authConfig,
        keyResolver,
        jwtVerifyImplementation,
        decodeProtectedHeaderImplementation,
        createRemoteJWKSetImplementation,
        joseLoader = loadJose
    }) {
        this.config = authConfig;
        this.keyResolver = keyResolver || null;
        this.jwtVerify = jwtVerifyImplementation || null;
        this.decodeProtectedHeader = decodeProtectedHeaderImplementation || null;
        this.createRemoteJWKSet = createRemoteJWKSetImplementation || null;
        this.joseLoader = joseLoader;
        this.initializationPromise = null;
    }

    async ensureJose() {
        if (this.keyResolver && this.jwtVerify && this.decodeProtectedHeader) return;

        this.initializationPromise ||= (async () => {
            const jose = await this.joseLoader();
            this.jwtVerify ||= jose.jwtVerify;
            this.decodeProtectedHeader ||= jose.decodeProtectedHeader;
            this.createRemoteJWKSet ||= jose.createRemoteJWKSet;
            this.keyResolver ||= this.createRemoteJWKSet(new URL(this.config.jwksUri), {
                timeoutDuration: 5000,
                cooldownDuration: 30000,
                cacheMaxAge: 600000
            });
        })();

        await this.initializationPromise;
    }

    extractFromHttpRequest(request) {
        return extractBearerToken(request, this.config.tokenMaxLength);
    }

    extractFromSocket(socket) {
        if (socket.handshake?.query?.token || socket.handshake?.query?.accessToken) throw authenticationError('INVALID_ACCESS_TOKEN', null, 'socket_query_token');
        const token = socket.handshake?.auth?.accessToken;
        if (typeof token !== 'string' || !token || /\s/.test(token) || token.length > this.config.tokenMaxLength) {
            throw authenticationError('AUTHENTICATION_REQUIRED', null, 'socket_token_missing_or_invalid');
        }
        return token;
    }

    async verify(token) {
        try {
            await this.ensureJose();
            const header = this.decodeProtectedHeader(token);
            if (!header.alg || !this.config.allowedAlgorithms.includes(header.alg) || header.alg === 'none' || header.alg.startsWith('HS')) {
                throw authenticationError('INVALID_ACCESS_TOKEN', null, 'disallowed_algorithm');
            }
            if (!header.kid) throw authenticationError('INVALID_ACCESS_TOKEN', null, 'missing_key_id');
            const result = await this.jwtVerify(token, this.keyResolver, {
                issuer: this.config.issuer,
                audience: this.config.audience,
                algorithms: this.config.allowedAlgorithms,
                clockTolerance: this.config.clockToleranceSeconds,
                requiredClaims: ['iss', 'aud', 'exp', 'iat']
            });
            return { claims: result.payload, protectedHeader: result.protectedHeader };
        } catch (error) {
            if (error?.statusCode === 401) throw error;
            const safeReason = error?.code === 'ERR_JWT_EXPIRED' ? 'expired' : (error?.code || 'verification_failed');
            throw authenticationError('INVALID_ACCESS_TOKEN', error, safeReason);
        }
    }
}

module.exports = AccessTokenVerifier;
module.exports.extractBearerToken = extractBearerToken;
