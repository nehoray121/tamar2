const { randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { createServer } = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(projectRoot, 'tamar-server');
const readPort = (name, fallback) => {
    const value = Number.parseInt(process.env[name] || String(fallback), 10);
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error(name + ' must be a valid TCP port');
    }
    return value;
};
const localAuthPort = readPort('TAMAR_DEV_LOCAL_AUTH_PORT', 4100);
const backendPort = readPort('TAMAR_DEV_BACKEND_PORT', 4000);
const frontendPort = readPort('TAMAR_DEV_FRONTEND_PORT', 5174);
const loopback = '127.0.0.1';
const localAuthUrl = 'http://' + loopback + ':' + localAuthPort;
const frontendOrigin = 'http://' + loopback + ':' + frontendPort;
const secretDirectory = path.join(process.env.TEMP || process.env.TMP || 'C:\\tmp', 'tamar-local-auth');
const hmacPath = path.join(secretDirectory, 'identity-lookup-hmac.key');
const children = new Set();
let shuttingDown = false;

const ensureStableHmacKey = () => {
    fs.mkdirSync(secretDirectory, { recursive: true });
    if (!fs.existsSync(hmacPath)) {
        fs.writeFileSync(hmacPath, randomBytes(48).toString('base64url'), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    }
    const key = fs.readFileSync(hmacPath, 'utf8').trim();
    if (Buffer.byteLength(key, 'utf8') < 32) throw new Error('The local HMAC key is invalid');
    return key;
};
const assertPortAvailable = (port) => new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once('error', () => reject(new Error('Port ' + port + ' is already in use; refusing to stop an unowned process')));
    probe.listen(port, loopback, () => probe.close(resolve));
});
const spawnTracked = (command, args, options = {}) => {
    const child = spawn(command, args, {
        cwd: options.cwd || projectRoot,
        env: options.env,
        stdio: options.stdio || 'inherit',
        windowsHide: true
    });
    children.add(child);
    child.once('exit', () => children.delete(child));
    child.once('error', (error) => {
        console.error(JSON.stringify({ event: 'dev-tamar.child-error', command: path.basename(command), message: error.message }));
    });
    return child;
};
const terminate = (child) => {
    if (!child || child.exitCode !== null || child.signalCode) return;
    if (process.platform === 'win32') {
        spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    } else {
        child.kill('SIGTERM');
    }
};
const shutdown = (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of [...children]) terminate(child);
    setTimeout(() => process.exit(exitCode), 100).unref();
};
const waitForHttp = async (url, timeoutMs = 20_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error('Service did not become ready: ' + url);
};
const waitForExit = (child) => new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
        if (code === 0 && !signal) resolve();
        else reject(new Error('Child exited with code ' + (code ?? 'null') + ' and signal ' + (signal ?? 'none')));
    });
});

const main = async () => {
    const hmacKey = ensureStableHmacKey();
    const backendEnvironment = {
        ...process.env,
        NODE_ENV: 'development',
        PORT: String(backendPort),
        CLIENT_ORIGINS: frontendOrigin,
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/?replicaSet=rs0',
        MONGODB_DATABASE: 'tamar_dev',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        AUTH_MODE: 'access_token',
        TAMAR_AUTH_MODE: 'local-personal-number',
        SSO_ISSUER: localAuthUrl + '/',
        SSO_AUDIENCE: 'api://tamar-local-development',
        SSO_JWKS_URI: localAuthUrl + '/.well-known/jwks.json',
        SSO_PROVIDER_KEY: 'local-development',
        SSO_ALLOWED_ALGORITHMS: 'RS256',
        SSO_SUBJECT_CLAIM: 'sub',
        SSO_PERSONAL_NUMBER_CLAIM: 'personal_number',
        SSO_DISPLAY_NAME_CLAIM: 'name',
        SSO_EMAIL_CLAIM: '',
        SSO_PERSONAL_NUMBER_PATTERN: '^(?:[0-9]{7}|[0-9]{9})$',
        AUTH_CLOCK_TOLERANCE_SECONDS: '5',
        AUTH_TOKEN_MAX_LENGTH: '16384',
        IDENTITY_LOOKUP_HMAC_KEY: hmacKey,
        LOCAL_AUTH_HOST: loopback,
        LOCAL_AUTH_PORT: String(localAuthPort),
        LOCAL_AUTH_ISSUER: localAuthUrl + '/',
        LOCAL_AUTH_AUDIENCE: 'api://tamar-local-development',
        LOCAL_AUTH_CLIENT_ORIGIN: frontendOrigin,
        LOCAL_AUTH_TOKEN_TTL_SECONDS: process.env.LOCAL_AUTH_TOKEN_TTL_SECONDS || '900'
    };

    const seedArgs = ['scripts/local-auth/seed.js'];
    if (process.argv.includes('--reset')) {
        seedArgs.push('--reset');
        const confirmation = process.argv.find((argument) => argument.startsWith('--confirm-reset='));
        if (confirmation) seedArgs.push(confirmation);
    }
    const seed = spawnTracked(process.execPath, seedArgs, { cwd: backendRoot, env: backendEnvironment });
    await waitForExit(seed);
    if (process.argv.includes('--seed-only')) return;

    await Promise.all([localAuthPort, backendPort, frontendPort].map(assertPortAvailable));
    const localAuth = spawnTracked(process.execPath, ['scripts/local-auth/server.js'], { cwd: backendRoot, env: backendEnvironment });
    await waitForHttp(localAuthUrl + '/health');

    const backend = spawnTracked(process.execPath, ['src/server.js'], { cwd: backendRoot, env: backendEnvironment });
    await waitForHttp('http://' + loopback + ':' + backendPort + '/api/health');

    const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    const frontend = spawnTracked(process.execPath, [viteCli, '--host', loopback, '--port', String(frontendPort), '--strictPort'], {
        cwd: projectRoot,
        env: {
            ...process.env,
            VITE_API_PROXY_TARGET: 'http://' + loopback + ':' + backendPort,
            VITE_TAMAR_LOCAL_PERSONAL_NUMBER_LOGIN: 'true',
            VITE_TAMAR_LOCAL_AUTH_URL: localAuthUrl
        }
    });
    await waitForHttp(frontendOrigin);

    console.log(JSON.stringify({
        event: 'dev-tamar.ready',
        frontend: frontendOrigin,
        backend: 'http://' + loopback + ':' + backendPort,
        localIdentityProvider: localAuthUrl,
        database: 'tamar_dev'
    }));

    for (const child of [localAuth, backend, frontend]) {
        child.once('exit', (code, signal) => {
            if (!shuttingDown) {
                console.error(JSON.stringify({ event: 'dev-tamar.unexpected-exit', processId: child.pid, code, signal }));
                shutdown(1);
            }
        });
    }
};

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
main().catch((error) => {
    console.error(JSON.stringify({ event: 'dev-tamar.failed', message: error.message }));
    shutdown(1);
});
