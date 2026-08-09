const { spawn } = require('node:child_process');
const { createServer: createHttpServer } = require('node:http');
const { createServer: createNetServer } = require('node:net');
const path = require('node:path');
const { exportJWK, generateKeyPair, SignJWT } = require('jose');
const { io: createSocketClient } = require('socket.io-client');

const projectRoot = path.resolve(__dirname, '..');
const approvedOrigin = 'http://localhost:5173';
const deniedOrigin = 'https://denied.example.invalid';
const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/?replicaSet=rs0';

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const getAvailablePort = () => new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        probe.close((error) => error ? reject(error) : resolve(address.port));
    });
});

const listen = (server) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const closeServer = (server) => new Promise((resolve, reject) => {
    if (!server?.listening) return resolve();
    server.close((error) => error ? reject(error) : resolve());
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
});

const createLocalIdentityProvider = async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(publicKey);
    const kid = 'phase2b-smoke-key';
    Object.assign(publicJwk, { kid, alg: 'RS256', use: 'sig' });
    let jwksRequests = 0;
    const server = createHttpServer((request, response) => {
        if (request.url !== '/.well-known/jwks.json') {
            response.writeHead(404).end();
            return;
        }
        jwksRequests += 1;
        response.writeHead(200, {
            'content-type': 'application/json',
            'cache-control': 'public, max-age=60'
        });
        response.end(JSON.stringify({ keys: [publicJwk] }));
    });
    const port = await listen(server);
    const issuer = 'http://127.0.0.1:' + port + '/';
    const audience = 'api://tamar-phase2b-smoke';
    return {
        server,
        issuer,
        audience,
        jwksUri: issuer + '.well-known/jwks.json',
        getJwksRequests: () => jwksRequests,
        signAccessToken: () => new SignJWT({
            personal_number: '123456789',
            name: 'Phase 2B Smoke User',
            email: 'phase2b-smoke@example.invalid'
        })
            .setProtectedHeader({ alg: 'RS256', kid, typ: 'JWT' })
            .setIssuer(issuer)
            .setAudience(audience)
            .setSubject('phase2b-smoke-subject')
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(privateKey)
    };
};

const waitForHttp = async (url, timeoutMs = 15_000) => {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error('Server did not become ready: ' + (lastError?.message || 'timeout'));
};

const requestJson = async (url, options) => {
    const response = await fetch(url, options);
    const body = await response.json();
    return { response, body };
};

const verifyDisconnectedReadiness = async (config, logger) => {
    const createApp = require('../src/app.js');
    const app = createApp({ config, logger });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    try {
        const { response, body } = await requestJson('http://127.0.0.1:' + port + '/api/health/ready');
        assert(response.status === 503, 'Disconnected readiness must return HTTP 503');
        assert(body?.success === false && body?.error?.code === 'DATABASE_UNAVAILABLE', 'Disconnected readiness returned an unexpected body');
    } finally {
        await closeServer(server);
    }
};

const verifySocketRejected = (baseUrl, { origin = approvedOrigin, accessToken, expectedMessage }) => new Promise((resolve, reject) => {
    const socket = createSocketClient(baseUrl, {
        transports: ['polling'],
        auth: accessToken ? { accessToken } : {},
        extraHeaders: { Origin: origin },
        reconnection: false,
        timeout: 3_000
    });
    const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('Rejected Socket.IO connection did not fail in time'));
    }, 4_000);
    socket.once('connect', () => {
        clearTimeout(timeout);
        socket.close();
        reject(new Error('Rejected Socket.IO connection connected successfully'));
    });
    socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        socket.close();
        if (expectedMessage && error.message !== expectedMessage) {
            reject(new Error('Unexpected Socket.IO rejection: ' + error.message));
            return;
        }
        resolve();
    });
});

const verifySocketAllowed = (baseUrl, accessToken) => new Promise((resolve, reject) => {
    const socket = createSocketClient(baseUrl, {
        transports: ['websocket', 'polling'],
        auth: { accessToken },
        extraHeaders: { Origin: approvedOrigin },
        reconnection: false,
        timeout: 4_000
    });
    const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('Authenticated Socket.IO connection timed out'));
    }, 5_000);
    socket.once('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve();
    });
    socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        socket.close();
        reject(error);
    });
});

const waitForExit = (child, timeoutMs = 12_000) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not exit after shutdown request')), timeoutMs);
    child.once('exit', (code, signal) => {
        clearTimeout(timeout);
        resolve({ code, signal });
    });
});

const main = async () => {
    const identityProvider = await createLocalIdentityProvider();
    const accessToken = await identityProvider.signAccessToken();
    const port = await getAvailablePort();
    const baseUrl = 'http://127.0.0.1:' + port;
    const smokeEnvironment = {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(port),
        CLIENT_ORIGINS: approvedOrigin,
        MONGODB_URI: mongodbUri,
        MONGODB_DATABASE: 'tamar_test',
        LOG_LEVEL: 'info',
        AUTH_MODE: 'access_token',
        SSO_ISSUER: identityProvider.issuer,
        SSO_AUDIENCE: identityProvider.audience,
        SSO_JWKS_URI: identityProvider.jwksUri,
        SSO_PROVIDER_KEY: 'phase2b-smoke',
        SSO_ALLOWED_ALGORITHMS: 'RS256',
        SSO_SUBJECT_CLAIM: 'sub',
        SSO_PERSONAL_NUMBER_CLAIM: 'personal_number',
        SSO_DISPLAY_NAME_CLAIM: 'name',
        SSO_EMAIL_CLAIM: 'email',
        SSO_PERSONAL_NUMBER_PATTERN: '^[0-9]{9}$',
        AUTH_CLOCK_TOLERANCE_SECONDS: '0',
        AUTH_TOKEN_MAX_LENGTH: '16384',
        IDENTITY_LOOKUP_HMAC_KEY: 'phase2b-smoke-only-hmac-key-with-32-bytes-minimum'
    };

    Object.assign(process.env, smokeEnvironment);
    const { loadEnvironment } = require('../src/config/env.js');
    const { createLogger } = require('../src/config/logger.js');
    const config = loadEnvironment({ loadDotenv: false });
    const logger = createLogger('error');
    await verifyDisconnectedReadiness(config, logger);

    const child = spawn(process.execPath, ['src/server.js'], {
        cwd: projectRoot,
        env: smokeEnvironment,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    try {
        await waitForHttp(baseUrl + '/api/health');

        const health = await requestJson(baseUrl + '/api/health');
        assert(health.response.status === 200, 'Health endpoint did not return HTTP 200');
        assert(health.body?.success === true && health.body?.data?.status === 'alive', 'Health response envelope is invalid');

        const ready = await requestJson(baseUrl + '/api/health/ready');
        assert(ready.response.status === 200, 'Readiness endpoint did not return HTTP 200');
        assert(ready.body?.success === true && ready.body?.data?.database === 'connected', 'Readiness response envelope is invalid');

        const deniedCors = await requestJson(baseUrl + '/api/health', { headers: { Origin: deniedOrigin } });
        assert(deniedCors.response.status === 403, 'Disallowed HTTP origin was not rejected');

        const noToken = await requestJson(baseUrl + '/api/auth/me');
        assert(noToken.response.status === 401 && noToken.body?.error?.code === 'AUTHENTICATION_REQUIRED', 'Missing REST token was not rejected');

        const invalidToken = await requestJson(baseUrl + '/api/auth/me', {
            headers: { Authorization: 'Bearer not-a-jwt' }
        });
        assert(invalidToken.response.status === 401 && invalidToken.body?.error?.code === 'INVALID_ACCESS_TOKEN', 'Invalid REST token was not rejected');

        const authenticated = await requestJson(baseUrl + '/api/auth/me', {
            headers: { Authorization: 'Bearer ' + accessToken }
        });
        assert(authenticated.response.status === 200, 'Valid Access Token was not accepted');
        assert(authenticated.body?.data?.status === 'ACCESS_REQUIRED', 'Unprovisioned verified identity did not return ACCESS_REQUIRED');
        assert(authenticated.body?.data?.identity?.personalNumberMasked === '***6789', 'Verified identity was not safely masked');
        assert(authenticated.response.headers.get('cache-control')?.includes('no-store'), 'Authentication response is cacheable');
        assert(identityProvider.getJwksRequests() > 0, 'Remote JWKS endpoint was not used');

        const requestId = 'smoke-request-404';
        const missing = await requestJson(baseUrl + '/api/does-not-exist', { headers: { 'X-Request-Id': requestId } });
        assert(missing.response.status === 404, 'Unknown route did not return HTTP 404');
        assert(missing.body?.error?.code === 'NOT_FOUND', 'Unknown route returned an unexpected error');
        assert(missing.response.headers.get('x-request-id') === requestId, 'Valid request ID was not preserved');

        await verifySocketRejected(baseUrl, { expectedMessage: 'AUTHENTICATION_REQUIRED' });
        await verifySocketRejected(baseUrl, { origin: deniedOrigin, accessToken });
        await verifySocketAllowed(baseUrl, accessToken);

        child.send({ type: 'system:smoke-shutdown' });
        const exit = await waitForExit(child);
        assert(exit.code === 0, 'Server exited with code ' + exit.code + ' and signal ' + exit.signal);
        assert(stdout.includes('shutdown.completed'), 'Graceful shutdown completion was not logged');

        console.log(JSON.stringify({
            success: true,
            checks: {
                health: health.response.status,
                readiness: ready.response.status,
                readinessWhenDisconnected: 503,
                corsDenied: deniedCors.response.status,
                authMissing: noToken.response.status,
                authInvalid: invalidToken.response.status,
                authVerified: authenticated.body.data.status,
                remoteJwks: identityProvider.getJwksRequests(),
                socketAuthenticated: true,
                socketMissingTokenDenied: true,
                socketOriginDenied: true,
                gracefulShutdown: true
            }
        }, null, 2));
    } catch (error) {
        if (child.connected) child.send({ type: 'system:smoke-shutdown' });
        else if (!child.killed) child.kill();
        console.error(error.message);
        if (stdout) console.error('Server stdout:\n' + stdout.slice(-4_000));
        if (stderr) console.error('Server stderr:\n' + stderr.slice(-4_000));
        process.exitCode = 1;
    } finally {
        await closeServer(identityProvider.server);
    }
};

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
