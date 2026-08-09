const AppError = require('../errors/AppError.js');
const { ACCESS_REQUEST_STATUSES, ROLES } = require('../domain/access/constants.js');
const AccessRequest = require('../models/AccessRequest.js');

const duplicatePendingError = (cause) => new AppError({ statusCode: 409, code: 'ACCESS_REQUEST_DUPLICATE', message: 'An equivalent pending Access Request already exists', cause });
const identityKey = (hash) => `identity:${hash}`;

class AccessRequestRepository {
    async create(payload, options = {}) {
        try {
            const [request] = await AccessRequest.create([payload], { session: options.session });
            return request;
        } catch (error) {
            if (error?.code === 11000) throw duplicatePendingError(error);
            throw error;
        }
    }
    async findById(requestId, options = {}) {
        let query = AccessRequest.findById(requestId).session(options.session || null);
        if (options.includeIdentityProtection) query = query.select('+requesterKey +requesterIdentitySnapshot.personalNumberLookupHash +requesterIdentitySnapshot.personalNumberLast4');
        return query.exec();
    }
    async findPendingEquivalent({ personalNumberLookupHash, requestedRole, requestedScopeType, requestedScopeId }, options = {}) {
        return AccessRequest.findOne({ requesterKey: identityKey(personalNumberLookupHash), requestedRole, requestedScopeType, requestedScopeId, status: ACCESS_REQUEST_STATUSES.PENDING })
            .select('+requesterKey').session(options.session || null).lean().exec();
    }
    async findCurrentPendingForIdentity({ personalNumberLookupHash, requesterUserId }, options = {}) {
        const query = { status: ACCESS_REQUEST_STATUSES.PENDING, $or: [{ requesterKey: identityKey(personalNumberLookupHash) }] };
        if (requesterUserId) query.$or.push({ requesterUserId });
        return AccessRequest.findOne(query).sort({ createdAt: -1 }).session(options.session || null).lean().exec();
    }
    async listForIdentity({ personalNumberLookupHash, requesterUserId }, options = {}) {
        const query = { $or: [{ requesterKey: identityKey(personalNumberLookupHash) }] };
        if (requesterUserId) query.$or.push({ requesterUserId });
        return AccessRequest.find(query).sort({ createdAt: -1 }).session(options.session || null).lean().exec();
    }
    async listReviewable(effectiveAccess, { status = ACCESS_REQUEST_STATUSES.PENDING, page = 1, limit = 25 } = {}) {
        const clauses = [];
        if (effectiveAccess.global && effectiveAccess.systemIds.length) clauses.push({ systemId: { $in: effectiveAccess.systemIds } });
        const subEnvironmentIds = effectiveAccess.memberships.filter((item) => item.role === ROLES.SYSTEM_ADMIN).map((item) => item.subEnvironmentId);
        if (subEnvironmentIds.length) clauses.push({ subEnvironmentId: { $in: subEnvironmentIds }, requestedRole: { $ne: ROLES.SYSTEM_ADMIN } });
        const roomIds = effectiveAccess.memberships.filter((item) => item.role === ROLES.ROOM_MANAGER).map((item) => item.roomId);
        if (roomIds.length) clauses.push({ roomId: { $in: roomIds }, requestedRole: ROLES.ROOM_USER });
        if (!clauses.length) return { items: [], total: 0, page, limit };
        const query = { status, $or: clauses };
        const [items, total] = await Promise.all([
            AccessRequest.find(query).sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            AccessRequest.countDocuments(query).exec()
        ]);
        return { items, total, page, limit };
    }
    async savePendingDecision(request, updates, options = {}) {
        const updated = await AccessRequest.findOneAndUpdate(
            { _id: request._id, status: ACCESS_REQUEST_STATUSES.PENDING },
            { $set: updates },
            { returnDocument: 'after', runValidators: true, session: options.session }
        ).exec();
        if (!updated) throw new AppError({ statusCode: 409, code: 'ACCESS_REQUEST_NOT_PENDING', message: 'Access Request is no longer pending' });
        return updated;
    }
}

module.exports = AccessRequestRepository;
module.exports.identityKey = identityKey;
