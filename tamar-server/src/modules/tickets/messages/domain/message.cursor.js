const mongoose = require('mongoose');
const { MESSAGE_LIMITS } = require('./message.constants.js');
const { messageError } = require('./message.errors.js');

const invalidCursor = () => messageError(400, 'VALIDATION_ERROR', 'Message cursor is invalid', {
    before: 'INVALID_MESSAGE_CURSOR'
});

const encodeMessageCursor = (message) => Buffer.from(JSON.stringify({
    v: 1,
    t: new Date(message.createdAt).toISOString(),
    i: String(message._id)
}), 'utf8').toString('base64url');

const decodeMessageCursor = (value) => {
    if (typeof value !== 'string' || !value || value.length > MESSAGE_LIMITS.MAX_CURSOR_LENGTH
        || !/^[A-Za-z0-9_-]+$/.test(value)) throw invalidCursor();
    try {
        const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        if (!parsed || Object.getPrototypeOf(parsed) !== Object.prototype
            || Object.keys(parsed).sort().join(',') !== 'i,t,v'
            || parsed.v !== 1 || typeof parsed.t !== 'string'
            || typeof parsed.i !== 'string' || !mongoose.isValidObjectId(parsed.i)) throw invalidCursor();
        const createdAt = new Date(parsed.t);
        if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== parsed.t) throw invalidCursor();
        return { createdAt, id: parsed.i };
    } catch (error) {
        if (error?.code === 'VALIDATION_ERROR') throw error;
        throw invalidCursor();
    }
};

module.exports = { decodeMessageCursor, encodeMessageCursor };
