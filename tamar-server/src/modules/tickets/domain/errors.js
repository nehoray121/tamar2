const AppError = require('../../../errors/AppError.js');

const ticketError = (statusCode, code, message, fieldErrors = null) => new AppError({
    statusCode, code, message, fieldErrors
});

const ticketNotFound = () => ticketError(404, 'TICKET_NOT_FOUND', 'Ticket was not found');
const validationError = (message, fieldErrors = null) => ticketError(400, 'VALIDATION_ERROR', message, fieldErrors);

module.exports = { ticketError, ticketNotFound, validationError };
