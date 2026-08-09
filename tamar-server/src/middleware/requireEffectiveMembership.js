const AppError = require('../errors/AppError.js');
const createRequireEffectiveMembership = ({ scopeResolver }) => async (request, _response, next) => {
    try {
        const access = await scopeResolver.resolveEffectiveAccess(request.user?._id);
        if (!access.isActive || access.memberships.length === 0) throw new AppError({ statusCode: 403, code: 'FORBIDDEN', message: 'Effective Tamar access is required' });
        request.effectiveAccess = access;
        next();
    } catch (error) { next(error); }
};

module.exports = createRequireEffectiveMembership;
