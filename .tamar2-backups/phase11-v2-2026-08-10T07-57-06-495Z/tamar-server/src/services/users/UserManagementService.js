const mongoose = require('mongoose');
const AppError = require('../../errors/AppError.js');
const User = require('../../models/User.js');
const OrganizationMembership = require('../../models/OrganizationMembership.js');
const System = require('../../models/System.js');
const Environment = require('../../models/Environment.js');
const SubEnvironment = require('../../models/SubEnvironment.js');
const Room = require('../../models/Room.js');
const { ROLES, ROLE_AUTHORITY, ROLE_SCOPE_TYPES, SCOPE_TYPES } = require('../../domain/access/constants.js');

const ROLE_LABELS = Object.freeze({
    [ROLES.SUPER_ADMIN]: 'מנהל־על',
    [ROLES.SYSTEM_ADMIN]: 'מנהל תת־סביבה',
    [ROLES.ROOM_MANAGER]: 'מנהל חדר',
    [ROLES.ROOM_USER]: 'משתמש בחדר'
});
const objectId = (value) => new mongoose.Types.ObjectId(String(value));
const escapedRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class UserManagementService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async actorAccess(actorUserId) {
        const access = await this.scopeResolver.resolveEffectiveAccess(actorUserId);
        const canManage = access.global || access.memberships.some((membership) => [ROLES.SYSTEM_ADMIN, ROLES.ROOM_MANAGER].includes(membership.role));
        if (!access.isActive || !canManage) throw new AppError({ statusCode: 403, code: 'USER_MANAGEMENT_FORBIDDEN', message: 'User management is outside the authenticated authority' });
        return access;
    }

    membershipVisibility(access) {
        const clauses = [];
        const superSystems = access.memberships.filter((item) => item.role === ROLES.SUPER_ADMIN).map((item) => item.systemId);
        const adminSubs = access.memberships.filter((item) => item.role === ROLES.SYSTEM_ADMIN).map((item) => item.subEnvironmentId);
        const managedRooms = access.memberships.filter((item) => item.role === ROLES.ROOM_MANAGER).map((item) => item.roomId);
        if (superSystems.length) clauses.push({ systemId: { $in: superSystems } });
        if (adminSubs.length) clauses.push({ subEnvironmentId: { $in: adminSubs }, role: { $ne: ROLES.SUPER_ADMIN } });
        if (managedRooms.length) clauses.push({ roomId: { $in: managedRooms }, role: ROLES.ROOM_USER });
        return clauses.length ? { isActive: true, $or: clauses } : { _id: null };
    }

    async contextForMemberships(memberships) {
        const unique = (values) => [...new Set(values.filter(Boolean).map(String))].map(objectId);
        const [systems, environments, subEnvironments, rooms] = await Promise.all([
            System.find({ _id: { $in: unique(memberships.map((item) => item.systemId)) } }).select('_id name').lean().exec(),
            Environment.find({ _id: { $in: unique(memberships.map((item) => item.environmentId)) } }).select('_id name').lean().exec(),
            SubEnvironment.find({ _id: { $in: unique(memberships.map((item) => item.subEnvironmentId)) } }).select('_id name').lean().exec(),
            Room.find({ _id: { $in: unique(memberships.map((item) => item.roomId)) } }).select('_id name').lean().exec()
        ]);
        const map = (items) => new Map(items.map((item) => [String(item._id), item.name]));
        return { systems: map(systems), environments: map(environments), subEnvironments: map(subEnvironments), rooms: map(rooms) };
    }

    membershipDto(membership, context) {
        const names = [
            context.systems.get(String(membership.systemId)),
            context.environments.get(String(membership.environmentId)),
            context.subEnvironments.get(String(membership.subEnvironmentId)),
            context.rooms.get(String(membership.roomId))
        ].filter(Boolean);
        return {
            id: String(membership._id), role: membership.role, roleLabel: ROLE_LABELS[membership.role],
            scopeType: membership.scopeType, scopeId: String(membership.scopeId),
            systemId: String(membership.systemId),
            environmentId: membership.environmentId ? String(membership.environmentId) : null,
            subEnvironmentId: membership.subEnvironmentId ? String(membership.subEnvironmentId) : null,
            roomId: membership.roomId ? String(membership.roomId) : null,
            scopeLabel: names.join(' / '), createdAt: membership.createdAt
        };
    }

    userDto(user, memberships, context) {
        const ordered = [...memberships].sort((left, right) => (ROLE_AUTHORITY[right.role] || 0) - (ROLE_AUTHORITY[left.role] || 0) || new Date(left.createdAt) - new Date(right.createdAt));
        const membershipDtos = ordered.map((membership) => this.membershipDto(membership, context));
        const primary = membershipDtos[0] || null;
        return {
            id: String(user._id), displayName: user.displayName, email: user.email || null,
            personalNumberMasked: this.personalNumberService.mask(user.personalNumberLast4),
            isActive: Boolean(user.isActive), version: Number(user.__v) || 0,
            lastLoginAt: user.lastLoginAt || null, createdAt: user.createdAt, updatedAt: user.updatedAt,
            primaryRole: primary?.role || null, primaryScope: primary,
            memberships: membershipDtos, assignments: membershipDtos.slice(1),
            history: membershipDtos.map((membership) => ({
                id: membership.id, text: `${membership.roleLabel} · ${membership.scopeLabel}`,
                time: membership.createdAt
            }))
        };
    }

    async loadUsersAndMemberships(userIds) {
        const [users, memberships] = await Promise.all([
            User.find({ _id: { $in: userIds } }).select('+personalNumberLast4').lean().exec(),
            OrganizationMembership.find({ userId: { $in: userIds }, isActive: true }).sort({ createdAt: 1 }).lean().exec()
        ]);
        const context = await this.contextForMemberships(memberships);
        const byUser = new Map();
        memberships.forEach((membership) => {
            const key = String(membership.userId);
            byUser.set(key, [...(byUser.get(key) || []), membership]);
        });
        return users.map((user) => this.userDto(user, byUser.get(String(user._id)) || [], context));
    }

    async list(actorUserId, { search = '', status = 'ALL', role, page = 1, limit = 25 } = {}) {
        const access = await this.actorAccess(actorUserId);
        const membershipQuery = this.membershipVisibility(access);
        if (role) membershipQuery.role = role;
        const visibleIds = await OrganizationMembership.distinct('userId', membershipQuery).exec();
        const userQuery = { _id: { $in: visibleIds } };
        if (status !== 'ALL') userQuery.isActive = status === 'ACTIVE';
        if (search) {
            const regex = new RegExp(escapedRegex(search), 'iu');
            userQuery.$or = [{ displayName: regex }, { email: regex }, { personalNumberLast4: regex }];
        }
        const [users, totalItems] = await Promise.all([
            User.find(userQuery).select('+personalNumberLast4').sort({ displayName: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            User.countDocuments(userQuery).exec()
        ]);
        const ids = users.map((user) => user._id);
        const memberships = await OrganizationMembership.find({ userId: { $in: ids }, isActive: true }).sort({ createdAt: 1 }).lean().exec();
        const context = await this.contextForMemberships(memberships);
        const byUser = new Map();
        memberships.forEach((membership) => byUser.set(String(membership.userId), [...(byUser.get(String(membership.userId)) || []), membership]));
        return {
            items: users.map((user) => this.userDto(user, byUser.get(String(user._id)) || [], context)),
            pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit), hasNext: page * limit < totalItems, hasPrevious: page > 1 }
        };
    }

    async get(actorUserId, targetUserId) {
        const access = await this.actorAccess(actorUserId);
        const visibleIds = await OrganizationMembership.distinct('userId', this.membershipVisibility(access)).exec();
        if (!visibleIds.some((id) => sameId(id, targetUserId))) throw new AppError({ statusCode: 404, code: 'USER_NOT_FOUND', message: 'User was not found' });
        const [result] = await this.loadUsersAndMemberships([objectId(targetUserId)]);
        if (!result) throw new AppError({ statusCode: 404, code: 'USER_NOT_FOUND', message: 'User was not found' });
        return result;
    }

    async create(actorUserId, input) {
        await this.actorAccess(actorUserId);
        const protection = this.personalNumberService.protect(input.personalNumber);
        if (await this.userRepository.findByPersonalNumberLookupHash(protection.lookupHash)) {
            throw new AppError({ statusCode: 409, code: 'USER_ALREADY_EXISTS', message: 'A Tamar user already exists for this verified identifier' });
        }
        const user = await this.userRepository.create({
            personalNumberLookupHash: protection.lookupHash,
            personalNumberLast4: protection.last4,
            displayName: input.displayName,
            email: input.email || undefined,
            isActive: true
        });
        try {
            if (input.role === ROLES.SUPER_ADMIN) {
                await this.protectedRoleAssignmentService.assignSuperAdmin({ actorUserId, targetUserId: user._id, systemId: input.scope.systemId });
            } else {
                await this.membershipService.assignRole({ actorUserId, targetUserId: user._id, role: input.role, scope: input.scope });
            }
        } catch (error) {
            await User.deleteOne({ _id: user._id }).exec();
            throw error;
        }
        return this.get(actorUserId, user._id);
    }

    async update(actorUserId, targetUserId, expectedVersion, updates) {
        await this.get(actorUserId, targetUserId);
        if (updates.isActive === false) {
            const protectedMembership = await OrganizationMembership.exists({ userId: targetUserId, role: ROLES.SUPER_ADMIN, isActive: true });
            if (protectedMembership) throw new AppError({ statusCode: 403, code: 'PROTECTED_SUPER_ADMIN_DEACTIVATION', message: 'SUPER_ADMIN deactivation requires the protected administrative flow' });
        }
        const updated = await User.findOneAndUpdate(
            { _id: targetUserId, __v: expectedVersion },
            { $set: updates, $inc: { __v: 1 } },
            { returnDocument: 'after', runValidators: true }
        ).exec();
        if (!updated) throw new AppError({ statusCode: 409, code: 'USER_VERSION_CONFLICT', message: 'User changed while being edited' });
        return this.get(actorUserId, targetUserId);
    }

    async addMembership(actorUserId, targetUserId, input) {
        if (input.role === ROLES.SUPER_ADMIN) {
            await this.protectedRoleAssignmentService.assignSuperAdmin({ actorUserId, targetUserId, systemId: input.scope.systemId });
        } else {
            await this.membershipService.assignRole({ actorUserId, targetUserId, role: input.role, scope: input.scope });
        }
        return this.get(actorUserId, targetUserId);
    }

    async removeMembership(actorUserId, targetUserId, membershipId, reason) {
        const membership = await this.membershipRepository.findActiveById(membershipId);
        if (!membership || !sameId(membership.userId, targetUserId)) throw new AppError({ statusCode: 404, code: 'ACTIVE_MEMBERSHIP_NOT_FOUND', message: 'Active membership was not found' });
        if (membership.role === ROLES.SUPER_ADMIN) throw new AppError({ statusCode: 403, code: 'PROTECTED_ROLE_REVOCATION_REQUIRED', message: 'SUPER_ADMIN revocation is not available through this endpoint' });
        await this.membershipService.revokeMembership({ actorUserId, membershipId, reason });
        return this.get(actorUserId, targetUserId);
    }

    async options(actorUserId) {
        const access = await this.actorAccess(actorUserId);
        const systemIds = access.systemIds;
        const systems = await System.find({ _id: { $in: systemIds }, isActive: true, archivedAt: null }).select('_id name').lean().exec();
        const environments = await Environment.find({ systemId: { $in: systemIds }, isActive: true, archivedAt: null }).select('_id systemId name').lean().exec();
        const subEnvironments = await SubEnvironment.find({ systemId: { $in: systemIds }, isActive: true, archivedAt: null }).select('_id systemId environmentId name').lean().exec();
        const rooms = await Room.find({ systemId: { $in: systemIds }, isActive: true, archivedAt: null }).select('_id systemId environmentId subEnvironmentId name').lean().exec();
        const mapEntity = (entity) => Object.fromEntries(Object.entries(entity).map(([key, value]) => [key === '_id' ? 'id' : key, key.endsWith('Id') || key === '_id' ? String(value) : value]));
        const assignable = access.global ? [ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.ROOM_MANAGER, ROLES.ROOM_USER]
            : access.memberships.some((item) => item.role === ROLES.SYSTEM_ADMIN) ? [ROLES.ROOM_MANAGER, ROLES.ROOM_USER]
                : [ROLES.ROOM_USER];
        return {
            roles: assignable.map((role) => ({ key: role, label: ROLE_LABELS[role], scopeType: ROLE_SCOPE_TYPES[role] })),
            systems: systems.map(mapEntity), environments: environments.map(mapEntity),
            subEnvironments: subEnvironments.map(mapEntity), rooms: rooms.map(mapEntity)
        };
    }
}

module.exports = UserManagementService;
module.exports.ROLE_LABELS = ROLE_LABELS;