const AppError = require('../../../../errors/AppError.js');

const messageError = (statusCode, code, message, fieldErrors = null) => new AppError({
    statusCode, code, message, fieldErrors
});

const messageNotFound = () => messageError(404, 'MESSAGE_NOT_FOUND', 'Message was not found');

module.exports = { messageError, messageNotFound };
