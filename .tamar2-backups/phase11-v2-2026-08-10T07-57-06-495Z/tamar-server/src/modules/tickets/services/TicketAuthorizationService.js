const { ROLES } = require('../../../domain/access/constants.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const includesId = (values, value) => (values || []).some((item) => sameId(item, value));
const roleRank = Object.freeze({
    [ROLES.ROOM_USER]: 1,
    [ROLES.ROOM_MANAGER]: 2,
    [ROLES.SYSTEM_ADMIN]: 3,
    [ROLES.SUPER_ADMIN]: 4
});

class TicketAuthorizationService {
    constructor({ scopeResolver }) { this.scopeResolver = scopeResolver; }

    resolveAccess(userId, options = {}) { return this.scopeResolver.resolveEffectiveAccess(userId, options); }

    isSystemAdministrator(access, ticket) {
        return access?.memberships?.some((membership) => membership.role === ROLES.SUPER_ADMIN
            && sameId(membership.systemId, ticket.systemId));
    }

    canAccessCurrentRoom(access, ticket) {
        return Boolean(access?.isActive && (this.isSystemAdministrator(access, ticket)
            || includesId(access.roomIds, ticket.currentRoomId)
            || (access.memberships || []).some((membership) => (
                ([ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(membership.role)
                    && sameId(membership.roomId, ticket.currentRoomId))
                || (membership.role === ROLES.SYSTEM_ADMIN
                    && sameId(membership.subEnvironmentId, ticket.subEnvironmentId))
            ))));
    }

    canAccessVisibleRooms(access, ticket) {
        const visibleRoomIds = ticket.visibleRoomIds?.length
            ? ticket.visibleRoomIds
            : [ticket.currentRoomId];
        return Boolean(access?.isActive && (this.isSystemAdministrator(access, ticket)
            || visibleRoomIds.some((roomId) => includesId(access.roomIds, roomId))
            || visibleRoomIds.some((roomId) => (access.memberships || []).some((membership) => (
                ([ROLES.ROOM_USER, ROLES.ROOM_MANAGER].includes(membership.role)
                    && sameId(membership.roomId, roomId))
                || (membership.role === ROLES.SYSTEM_ADMIN
                    && sameId(membership.subEnvironmentId, ticket.subEnvironmentId))
            )))));
    }

    hasManagementAuthority(access, ticket) {
        return Boolean(access?.isActive && (this.isSystemAdministrator(access, ticket)
            || includesId(access.managedRoomIds, ticket.currentRoomId)
            || (access.memberships || []).some((membership) => (
                (membership.role === ROLES.SYSTEM_ADMIN
                    && sameId(membership.subEnvironmentId, ticket.subEnvironmentId))
                || (membership.role === ROLES.ROOM_MANAGER
                    && sameId(membership.roomId, ticket.currentRoomId))
            ))));
    }

    matchingMemberships(access, ticket) {
        return (access?.memberships || []).filter((membership) => (
            (membership.role === ROLES.SUPER_ADMIN && sameId(membership.systemId, ticket.systemId))
            || (membership.role === ROLES.SYSTEM_ADMIN
                && (includesId(access.systemAdminRoomIds, ticket.currentRoomId)
                    || sameId(membership.subEnvironmentId, ticket.subEnvironmentId)))
            || ([ROLES.ROOM_MANAGER, ROLES.ROOM_USER].includes(membership.role) && sameId(membership.roomId, ticket.currentRoomId))
        ));
    }

    canView(access, ticket) { return this.canAccessVisibleRooms(access, ticket); }

    canWriteChat(access, ticket) {
        const visibleRoomIds = [...new Set([
            ...(ticket.visibleRoomIds || []).map(String), String(ticket.currentRoomId)
        ])];
        return Boolean(this.canView(access, ticket)
            && visibleRoomIds.some((roomId) => includesId(access.roomIds, roomId)));
    }

    canCreate(access, lineage) {
        return Boolean(access?.isActive && (this.isSystemAdministrator(access, { systemId: lineage.systemId })
            || includesId(access.roomIds, lineage.roomId)));
    }

    canEdit(access, ticket) {
        return !ticket.activeTransferId && this.hasManagementAuthority(access, ticket);
    }

    canClose(access, ticket) {
        return ticket.status === 'OPEN' && !ticket.activeTransferId && this.canAccessCurrentRoom(access, ticket);
    }

    hasAssignmentAuthority(access, ticket) {
        return !ticket.activeTransferId && this.hasManagementAuthority(access, ticket);
    }

    canAssign(access, ticket) { return this.hasAssignmentAuthority(access, ticket); }

    canTransfer(access, ticket) {
        return !ticket.activeTransferId && this.hasManagementAuthority(access, ticket);
    }

    actorRoleContext(access, ticket) {
        return this.matchingMemberships(access, ticket)
            .sort((left, right) => roleRank[right.role] - roleRank[left.role])[0]?.role || 'UNKNOWN';
    }

    buildAccessFilter(access, { historical = false } = {}) {
        if (!access?.isActive) return { _id: null };
        const systemIds = (access.memberships || []).filter((item) => item.role === ROLES.SUPER_ADMIN)
            .map((item) => String(item.systemId));
        const scopes = [];
        if (systemIds.length) scopes.push({ systemId: { $in: [...new Set(systemIds)] } });
        if ((access.roomIds || []).length) {
            scopes.push({ [historical ? 'visibleRoomIds' : 'currentRoomId']: { $in: access.roomIds } });
        }
        return scopes.length ? { $or: scopes } : { _id: null };
    }
}

module.exports = TicketAuthorizationService;