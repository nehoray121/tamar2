const { ticketError } = require('./errors.js');

const MAX_KEYS = 100;
const MAX_DEPTH = 4;
const MAX_BYTES = 64 * 1024;
const MAX_KEY_LENGTH = 128;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const invalid = (message) => ticketError(400, 'INVALID_FIELD_VALUES', message, { fieldValues: message });
const isPlainObject = (value) => value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));

const copyJsonValue = (value, depth, state) => {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw invalid('fieldValues contains a non-finite number');
        return value;
    }
    if (depth > MAX_DEPTH) throw invalid(`fieldValues may contain at most ${MAX_DEPTH} nested levels`);
    if (Array.isArray(value)) return value.map((item) => copyJsonValue(item, depth + 1, state));
    if (!isPlainObject(value)) throw invalid('fieldValues may contain only JSON-safe plain values');

    const result = Object.create(null);
    for (const key of Object.keys(value)) {
        state.keys += 1;
        if (state.keys > MAX_KEYS) throw invalid(`fieldValues may contain at most ${MAX_KEYS} keys`);
        if (!key || key.length > MAX_KEY_LENGTH || key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key)) {
            throw invalid('fieldValues contains an unsafe key');
        }
        result[key] = copyJsonValue(value[key], depth + 1, state);
    }
    return result;
};

const sanitizeFieldValues = (value) => {
    if (value === undefined) return undefined;
    if (!isPlainObject(value)) throw invalid('fieldValues must be a plain object');
    const safe = copyJsonValue(value, 1, { keys: 0 });
    let serialized;
    try { serialized = JSON.stringify(safe); } catch { throw invalid('fieldValues must be valid JSON'); }
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) throw invalid('fieldValues exceeds the 64KB limit');
    return safe;
};

const isValidFieldValues = (value) => {
    try { sanitizeFieldValues(value); return true; } catch { return false; }
};

module.exports = { sanitizeFieldValues, isValidFieldValues };
