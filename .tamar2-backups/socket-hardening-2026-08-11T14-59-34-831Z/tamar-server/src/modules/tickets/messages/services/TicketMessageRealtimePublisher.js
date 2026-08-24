class TicketMessageRealtimePublisher {
    constructor({ organization, logger }) {
        Object.assign(this, { organization, logger });
        this.io = null;
    }

    setIo(io) { this.io = io; }

    async publish(eventType, message, ticket) {
        if (!this.io) return;
        const payload = {
            eventType,
            ticketId: String(message.ticketId),
            messageId: String(message._id),
            systemId: String(message.systemId),
            authorUserId: String(message.authorUserId),
            messageVersion: message.version,
            isDeleted: Boolean(message.isDeleted),
            createdAt: message.createdAt,
            updatedAt: message.updatedAt
        };
        try {
            const visibleIds = [...new Set([
                ...(ticket.visibleRoomIds || []).map(String), String(ticket.currentRoomId)
            ])];
            const lineages = await Promise.all(visibleIds.map(async (roomId) => {
                try {
                    return await this.organization.integrityService.resolveRoom(roomId, {
                        systemId: ticket.systemId, requireOperational: true
                    });
                } catch { return null; }
            }));
            const rooms = new Set([`system:${payload.systemId}`]);
            for (const lineage of lineages.filter(Boolean)) {
                rooms.add(`subEnvironment:${lineage.subEnvironment._id}`);
                rooms.add(`room:${lineage.room._id}`);
            }
            this.io.to([...rooms]).emit(eventType, payload);
        } catch (error) {
            this.logger?.warn('ticket.message_realtime_publish_failed', {
                eventType,
                ticketId: payload.ticketId,
                messageId: payload.messageId,
                reason: error?.code || 'publish_failed'
            });
        }
    }
}

module.exports = TicketMessageRealtimePublisher;
