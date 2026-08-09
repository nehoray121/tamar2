const AppError = require('../errors/AppError.js');

const authenticationError = (code = 'INVALID_ACCESS_TOKEN', cause, safeReason = 'invalid') => {
    const error = new AppError({
        statusCode: 401,
        code,
        message: code === 'AUTHENTICATION_REQUIRED' ? 'A valid Bearer Access Token is required' : 'The Access Token is invalid',
        cause
    });
    error.safeReason = safeReason;
    return error;
};

const identityError = (code, message, statusCode = 403) => new AppError({ statusCode, code, message });

module.exports = { authenticationError, identityError };
