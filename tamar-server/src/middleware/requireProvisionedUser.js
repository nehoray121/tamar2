const AppError = require('../errors/AppError.js');
const requireProvisionedUser = (request, _response, next) => {
    if (!request.user) return next(new AppError({ statusCode: 403, code: 'USER_NOT_PROVISIONED', message: 'A provisioned Tamar user is required' }));
    next();
};

module.exports = requireProvisionedUser;
