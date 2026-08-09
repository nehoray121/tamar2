const AppError = require('../errors/AppError.js');
const requireActiveUser = (request, _response, next) => {
    if (!request.user?.isActive) return next(new AppError({ statusCode: 403, code: request.user ? 'USER_DISABLED' : 'USER_NOT_PROVISIONED', message: request.user ? 'The authenticated user is disabled in Tamar' : 'A provisioned Tamar user is required' }));
    next();
};

module.exports = requireActiveUser;
