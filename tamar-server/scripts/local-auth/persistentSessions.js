const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const SESSION_FILE_NAME = 'local-auth-sessions-v1.json';

const resolveSessionFile = (source = process.env) => {
    const base = String(source.LOCALAPPDATA || '').trim()
        || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(base, 'Tamar', 'LocalAuth', SESSION_FILE_NAME);
};

const sessionHash = (token) => crypto
    .createHash('sha256')
    .update(String(token), 'utf8')
    .digest('hex');

const readState = (filePath) => {
    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
            version: 1,
            sessions: Array.isArray(parsed?.sessions)
                ? parsed.sessions.filter((item) => (
                    item
                    && typeof item.hash === 'string'
                    && typeof item.personalNumber === 'string'
                ))
                : []
        };
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
        return { version: 1, sessions: [] };
    }
};

const writeState = (filePath, state) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2), {
        encoding: 'utf8',
        flag: 'wx'
    });
    fs.renameSync(temporary, filePath);
};

class PersistentLocalSessions {
    constructor({ source = process.env } = {}) {
        this.filePath = resolveSessionFile(source);
    }

    create(personalNumber) {
        const token = crypto.randomBytes(32).toString('base64url');
        const hash = sessionHash(token);
        const state = readState(this.filePath);

        // One persistent local session per synthetic identity keeps the file
        // bounded while preserving the requested no-timeout behavior.
        state.sessions = state.sessions.filter(
            (item) => item.personalNumber !== personalNumber
        );
        state.sessions.push({
            hash,
            personalNumber,
            createdAt: new Date().toISOString()
        });
        writeState(this.filePath, state);
        return token;
    }

    get(token) {
        if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
            return null;
        }
        const hash = sessionHash(token);
        const state = readState(this.filePath);
        return state.sessions.find((item) => (
            crypto.timingSafeEqual(
                Buffer.from(item.hash, 'hex'),
                Buffer.from(hash, 'hex')
            )
        )) || null;
    }

    delete(token) {
        if (typeof token !== 'string' || !token) return false;
        const hash = sessionHash(token);
        const state = readState(this.filePath);
        const before = state.sessions.length;
        state.sessions = state.sessions.filter((item) => item.hash !== hash);
        if (state.sessions.length !== before) writeState(this.filePath, state);
        return state.sessions.length !== before;
    }
}

module.exports = {
    PersistentLocalSessions,
    resolveSessionFile,
    sessionHash
};
