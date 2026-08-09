const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class TicketMessageCapabilityService {
    forMessage(actorUserId, message, hasChatAccess) {
        const ownsLiveMessage = Boolean(hasChatAccess && !message.isDeleted
            && sameId(actorUserId, message.authorUserId));
        return { canEdit: ownsLiveMessage, canDelete: ownsLiveMessage };
    }
}

module.exports = TicketMessageCapabilityService;
