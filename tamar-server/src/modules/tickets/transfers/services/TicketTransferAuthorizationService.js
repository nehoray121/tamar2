const { ROLES } = require('../../../../domain/access/constants.js');
const { TRANSFER_DIRECTIONS } = require('../domain/transfer.constants.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const includesId = (values, value) => (values || []).some((item) => sameId(item, value));

class TicketTransferAuthorizationService {
    constructor({ ticketAuthorizationService }) { this.ticketAuthorizationService = ticketAuthorizationService; }

    superAdminSystemIds(access) {
        return [...new Set((access?.memberships || []).filter((item) => item.role === ROLES.SUPER_ADMIN)
            .map((item) => String(item.systemId)))];
    }

    canViewSource(access, transfer) {
        return Boolean(access?.isActive && (this.superAdminSystemIds(access).some((id) => sameId(id, transfer.systemId))
            || includesId(access.roomIds, transfer.sourceRoomId)));
    }

    canViewDestination(access, transfer) {
        return Boolean(access?.isActive && (this.superAdminSystemIds(access).some((id) => sameId(id, transfer.systemId))
            || includesId(access.roomIds, transfer.destinationRoomId)));
    }

    canView(access, transfer) { return this.canViewSource(access, transfer) || this.canViewDestination(access, transfer); }

    buildDirectionFilter(access, direction) {
        if (!access?.isActive) return { _id: null };
        const systemIds = this.superAdminSystemIds(access);
        const incoming = [];
        const outgoing = [];
        if (systemIds.length) {
            incoming.push({ systemId: { $in: systemIds } });
            outgoing.push({ systemId: { $in: systemIds } });
        }
        if ((access.roomIds || []).length) {
            incoming.push({ destinationRoomId: { $in: access.roomIds } });
            outgoing.push({ sourceRoomId: { $in: access.roomIds } });
        }
        const incomingFilter = incoming.length ? { $or: incoming } : { _id: null };
        const outgoingFilter = outgoing.length ? { $or: outgoing } : { _id: null };
        if (direction === TRANSFER_DIRECTIONS.INCOMING) return incomingFilter;
        if (direction === TRANSFER_DIRECTIONS.OUTGOING) return outgoingFilter;
        return { $or: [incomingFilter, outgoingFilter] };
    }
}

module.exports = TicketTransferAuthorizationService;
