const mongoose = require('mongoose');
const { ROLES } = require('../domain/access/constants.js');
const AppError = require('../errors/AppError.js');
const OrganizationMembership = require('../models/OrganizationMembership.js');

const objectId = (value) => new mongoose.Types.ObjectId(String(value));
const escapedRegex = (value) => String(value).replace(/[\^$.*+?()[\]{}|\\]/g, '\\$&');

const duplicateMembershipError = (cause) => new AppError({
    statusCode: 409,
    code: 'DUPLICATE_ACTIVE_MEMBERSHIP',
    message: 'An equivalent active membership already exists',
    cause
});

class OrganizationMembershipRepository {
    async create(payload, options = {}) {
        try {
            const [membership] = await OrganizationMembership.create([payload], { session: options.session });
            return membership;
        } catch (error) {
            if (error?.code === 11000) throw duplicateMembershipError(error);
            throw error;
        }
    }

    async findActiveByUserId(userId, options = {}) {
        return OrganizationMembership.find({ userId, isActive: true })
            .session(options.session || null)
            .lean()
            .exec();
    }

    async findActiveEquivalent({ userId, role, scopeType, scopeId }, options = {}) {
        return OrganizationMembership.findOne({ userId, role, scopeType, scopeId, isActive: true })
            .session(options.session || null)
            .lean()
            .exec();
    }

    async findActiveById(membershipId, options = {}) {
        return OrganizationMembership.findOne({ _id: membershipId, isActive: true })
            .session(options.session || null)
            .lean()
            .exec();
    }

    async findActiveAssignableRoomMemberships({ roomId, systemId, environmentId, subEnvironmentId, userIds }, options = {}) {
        return OrganizationMembership.find({
            userId: { $in: userIds },
            role: { $in: [ROLES.ROOM_USER, ROLES.ROOM_MANAGER] },
            scopeType: 'ROOM',
            scopeId: roomId,
            roomId,
            systemId,
            environmentId,
            subEnvironmentId,
            isActive: true
        }).session(options.session || null).lean().exec();
    }

    async listAssignableUsers({ ticket, search, page, limit, excludeUserIds = [] }, options = {}) {
        const match = {
            role: { $in: [ROLES.ROOM_USER, ROLES.ROOM_MANAGER] },
            scopeType: 'ROOM',
            scopeId: objectId(ticket.currentRoomId),
            roomId: objectId(ticket.currentRoomId),
            systemId: objectId(ticket.systemId),
            environmentId: objectId(ticket.environmentId),
            subEnvironmentId: objectId(ticket.subEnvironmentId),
            isActive: true
        };
        if (excludeUserIds.length) match.userId = { $nin: excludeUserIds.map(objectId) };
        const pipeline = [
            { $match: match },
            { $addFields: { eligibleRoleRank: { $cond: [{ $eq: ['$role', ROLES.ROOM_MANAGER] }, 2, 1] } } },
            { $sort: { userId: 1, eligibleRoleRank: -1 } },
            { $group: { _id: '$userId', eligibleRoomRole: { $first: '$role' } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: {
                'user.isActive': true,
                ...(search ? { $or: [
                    { 'user.displayName': new RegExp(escapedRegex(search), 'iu') },
                    { 'user.email': new RegExp(escapedRegex(search), 'iu') }
                ] } : {})
            } },
            { $project: {
                _id: '$user._id',
                displayName: '$user.displayName',
                email: '$user.email',
                eligibleRoomRole: 1
            } },
            { $sort: { displayName: 1, _id: 1 } },
            { $facet: {
                items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                total: [{ $count: 'count' }]
            } }
        ];
        const aggregate = OrganizationMembership.aggregate(pipeline);
        if (options.session) aggregate.session(options.session);
        const [result] = await aggregate.exec();
        return { items: result.items, totalItems: result.total[0]?.count || 0 };
    }

    async revoke(membershipId, { revokedBy, revocationReason }, options = {}) {
        const membership = await OrganizationMembership.findOneAndUpdate(
            { _id: membershipId, isActive: true },
            {
                $set: {
                    isActive: false,
                    revokedBy,
                    revokedAt: new Date(),
                    revocationReason
                }
            },
            { returnDocument: 'after', runValidators: true, session: options.session }
        ).exec();

        if (!membership) {
            throw new AppError({
                statusCode: 404,
                code: 'ACTIVE_MEMBERSHIP_NOT_FOUND',
                message: 'Active membership was not found'
            });
        }

        return membership;
    }
}

module.exports = OrganizationMembershipRepository;
