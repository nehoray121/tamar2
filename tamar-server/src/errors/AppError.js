class AppError extends Error {
    constructor({ statusCode = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', fieldErrors = null, cause } = {}) {
        super(message, { cause });
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.fieldErrors = fieldErrors;
    }
}

module.exports = AppError;
