const AppError = require('../errors/AppError.js');

const notFound = (request, response, next) => {
    next(new AppError({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'The requested resource was not found'
    }));
};

module.exports = notFound;
