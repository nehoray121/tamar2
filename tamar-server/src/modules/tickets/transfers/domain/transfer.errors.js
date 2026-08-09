const AppError = require('../../../../errors/AppError.js');

const transferError = (statusCode, code, message, fieldErrors = null) => new AppError({
    statusCode, code, message, fieldErrors
});

const transferNotFound = () => transferError(404, 'TRANSFER_NOT_FOUND', 'Transfer was not found');

module.exports = { transferError, transferNotFound };
