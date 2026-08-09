const AppError = require('../../../../errors/AppError.js');

const boardError = (statusCode, code, message, fieldErrors = null) => new AppError({
    statusCode, code, message, fieldErrors
});

const boardNotFound = () => boardError(404, 'BOARD_NOT_FOUND', 'Board was not found');
const boardItemNotFound = () => boardError(404, 'BOARD_ITEM_NOT_FOUND', 'Board item was not found');
const categoryNotFound = () => boardError(404, 'BOARD_CATEGORY_NOT_FOUND', 'Board category was not found');
const validationError = (message, fieldErrors = null) => boardError(400, 'VALIDATION_ERROR', message, fieldErrors);

module.exports = { boardError, boardNotFound, boardItemNotFound, categoryNotFound, validationError };
