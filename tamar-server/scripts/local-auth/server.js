const { createServer } = require('node:http');
const { loadLocalAuthConfig } = require('./config.js');
const { createDevelopmentSubject, normalizeDevelopmentPersonalNumber } = require('./identity.js');

const JSON_LIMIT = 1024;
const KEY_ID = 'tamar-local-development-rs256';

let josePromise = null;
const loadJose = () => {
    josePromise ||= import('jose');
    return josePromise;
};

const json = (response, statusCode, body, extraHeaders = {}) => {
    response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...extraHeaders
    });
    response.end(JSON.stringify(body));
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
    let bytes = 0;
    let source = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
        bytes += Buffer.byteLength(chunk, 'utf8');
        if (bytes > JSON_LIMIT) {
            reject(Object.assign(new Error('Request body is too large'), { statusCode: 413 }));
            request.destroy();
            return;
        }
        source += chunk;
    });
    request.on('end', () => {
        try { resolve(source ? JSON.parse(source) : {}); }
        catch { reject(Object.assign(new Error('Request body must be valid JSON'), { statusCode: 400 })); }
    });
    request.on('error', reject);
});

const createLocalIdentityProvider = async ({ source = process.env } = {}) => {
    const { exportJWK, generateKeyPair, SignJWT } = await loadJose();
    const config = loadLocalAuthConfig(source);
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    Object.assign(jwk, { kid: KEY_ID, alg: 'RS256', use: 'sig' });
    const attempts = [];
    const allowCors = (request) => request.headers.origin === config.clientOrigin;

    const server = createServer(async (request, response) => {
        const corsHeaders = allowCors(request)
            ? { 'access-control-allow-origin': config.clientOrigin, vary: 'Origin' }
            : {};

        if (request.method === 'OPTIONS') {
            if (!allowCors(request)) return json(response, 403, { error: 'ORIGIN_NOT_ALLOWED' });
            response.writeHead(204, {
                ...corsHeaders,
                'access-control-allow-methods': 'POST, GET, OPTIONS',
                'access-control-allow-headers': 'content-type'
            });
            return response.end();
        }
        if (request.method === 'GET' && request.url === '/health') {
            return json(response, 200, { status: 'ready', mode: 'local-development' }, corsHeaders);
        }
        if (request.method === 'GET' && request.url === '/.well-known/jwks.json') {
            return json(response, 200, { keys: [jwk] }, {
                ...corsHeaders,
                'cache-control': 'public, max-age=60'
            });
        }
        if (request.method !== 'POST' || request.url !== '/token') {
            return json(response, 404, { error: 'NOT_FOUND' }, corsHeaders);
        }
        if (!allowCors(request)) return json(response, 403, { error: 'ORIGIN_NOT_ALLOWED' });

        const now = Date.now();
        while (attempts.length && attempts[0] <= now - 60_000) attempts.shift();
        if (attempts.length >= 30) return json(response, 429, { error: 'RATE_LIMITED' }, corsHeaders);
        attempts.push(now);

        try {
            const body = await readJsonBody(request);
            if (!body || Object.keys(body).some((key) => key !== 'personalNumber')) {
                return json(response, 400, { error: 'INVALID_REQUEST' }, corsHeaders);
            }
            const personalNumber = normalizeDevelopmentPersonalNumber(body.personalNumber);
            if (!personalNumber) return json(response, 400, { error: 'INVALID_PERSONAL_NUMBER' }, corsHeaders);

            const nowSeconds = Math.floor(Date.now() / 1000);
            const token = await new SignJWT({
                [config.personalNumberClaim]: personalNumber,
                [config.displayNameClaim]: 'Tamar local development user'
            })
                .setProtectedHeader({ alg: 'RS256', kid: KEY_ID, typ: 'JWT' })
                .setIssuer(config.issuer)
                .setAudience(config.audience)
                .setSubject(createDevelopmentSubject(personalNumber))
                .setIssuedAt(nowSeconds)
                .setExpirationTime(nowSeconds + config.tokenTtlSeconds)
                .sign(privateKey);
            return json(response, 200, { accessToken: token, expiresIn: config.tokenTtlSeconds }, corsHeaders);
        } catch (error) {
            const statusCode = Number(error?.statusCode) || 500;
            return json(response, statusCode, { error: statusCode >= 500 ? 'TOKEN_ISSUANCE_FAILED' : 'INVALID_REQUEST' }, corsHeaders);
        }
    });

    return { config, publicJwk: jwk, server };
};

const start = async () => {
    const provider = await createLocalIdentityProvider();
    provider.server.listen(provider.config.port, provider.config.host, () => {
        console.log(JSON.stringify({
            event: 'local-auth.ready',
            host: provider.config.host,
            port: provider.config.port,
            issuer: provider.config.issuer
        }));
    });
    const shutdown = () => provider.server.close(() => process.exit(0));
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
};

if (require.main === module) {
    start().catch((error) => {
        console.error(JSON.stringify({ event: 'local-auth.start_failed', message: error.message }));
        process.exitCode = 1;
    });
}

module.exports = { createLocalIdentityProvider };
