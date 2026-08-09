const mongoose = require('mongoose');
const AppError = require('../errors/AppError.js');
const validationError = (message, fieldErrors = null) => new AppError({ statusCode: 400, code: 'VALIDATION_ERROR', message, fieldErrors });
const assertPlainObject = (value, name = 'body') => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw validationError(`${name} must be an object`);
    return value;
};
const assertExactKeys = (value, allowed, name = 'body') => {
    assertPlainObject(value, name);
    const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
    if (unknown.length) throw validationError(`${name} contains unknown fields`, Object.fromEntries(unknown.map((key) => [key, 'Field is not allowed'])));
    return value;
};
const requireString = (value, name, { maxLength = 1000, allowEmpty = false } = {}) => {
    if (typeof value !== 'string') throw validationError(`${name} must be a string`, { [name]: 'Required string' });
    const normalized = value.normalize('NFKC').trim();
    if ((!allowEmpty && !normalized) || normalized.length > maxLength || /[\u0000-\u001F\u007F]/u.test(normalized)) throw validationError(`${name} is invalid`, { [name]: 'Invalid value' });
    return normalized;
};
const optionalString = (value, name, options) => value === undefined ? undefined : requireString(value, name, { ...options, allowEmpty: true });
const requireObjectId = (value, name) => {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) throw validationError(`${name} must be a valid identifier`, { [name]: 'Invalid identifier' });
    return value;
};
const optionalObjectId = (value, name) => value === undefined ? undefined : requireObjectId(value, name);
const requireEnum = (value, name, allowed) => {
    if (!allowed.includes(value)) throw validationError(`${name} is invalid`, { [name]: 'Unsupported value' });
    return value;
};
const parsePositiveInteger = (value, name, fallback, max) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(String(value))) throw validationError(`${name} must be a positive integer`);
    const number = Number(value);
    if (number < 1 || number > max) throw validationError(`${name} is out of range`);
    return number;
};

module.exports = { assertExactKeys, optionalObjectId, optionalString, parsePositiveInteger, requireEnum, requireObjectId, requireString, validationError };
