const { TICKET_STATUSES } = require('../domain/constants.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class TicketCapabilityService {
    constructor({ authorizationService }) { this.authorizationService = authorizationService; }

    forTicket(access, ticket, activeTransfer = null) {
        const closed = ticket.status === TICKET_STATUSES.CLOSED;
        const pending = Boolean(ticket.activeTransferId && activeTransfer);
        const canView = this.authorizationService.canView(access, ticket);
        const currentRoomVisible = this.authorizationService.canAccessCurrentRoom(access, ticket);
        const management = this.authorizationService.hasManagementAuthority(access, ticket);
        const destinationActor = pending && currentRoomVisible
            && sameId(activeTransfer.destinationRoomId, ticket.currentRoomId);
        const sourceActor = pending && (activeTransfer.sourceRoomId
            ? (access?.roomIds || []).some((roomId) => sameId(roomId, activeTransfer.sourceRoomId))
                || this.authorizationService.isSystemAdministrator(access, ticket)
            : false);
        const canAcceptTransfer = canView && !closed && destinationActor && management;
        const canCancelTransfer = canAcceptTransfer;
        const canEdit = canView && !closed && !pending && this.authorizationService.canEdit(access, ticket);
        const canClose = canView && !closed && !pending && this.authorizationService.canClose(access, ticket);
        const canAssign = canView && !closed && !pending && this.authorizationService.canAssign(access, ticket);
        const canTransfer = canView && !closed && !pending && this.authorizationService.canTransfer(access, ticket);
        const isReadOnly = canView && !(canEdit || canClose || canAssign || canTransfer || canAcceptTransfer || canCancelTransfer);
        let readOnlyReason = null;
        if (closed) readOnlyReason = 'TICKET_CLOSED';
        else if (pending && destinationActor && !management) readOnlyReason = 'TRANSFER_REVIEW_REQUIRES_MANAGER';
        else if (pending && sourceActor) readOnlyReason = 'TRANSFER_PENDING_ACCEPTANCE';
        else if (canView && !currentRoomVisible) readOnlyReason = 'PREVIOUS_ROOM_READ_ONLY';
        else if (isReadOnly) readOnlyReason = 'INSUFFICIENT_ROLE';
        return {
            canView,
            canEdit,
            canClose,
            canAssign,
            canTransfer,
            canAcceptTransfer,
            canCancelTransfer,
            canChangeCategory: false,
            canChangePin: false,
            canWriteChat: canView && this.authorizationService.canWriteChat(access, ticket),
            isReadOnly,
            readOnlyReason
        };
    }
}

module.exports = TicketCapabilityService;