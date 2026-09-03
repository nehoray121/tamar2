class TicketRealtimePublisher {
    constructor({ logger }) {
        this.logger = logger;
        this.io = null;
    }

    setIo(io) {
        this.io = io;
    }

    publish(eventType, ticket) {
        if (!this.io) return;

        const visibleRoomIds = [...new Set([
            ...(ticket.visibleRoomIds || []).map(String),
            String(ticket.currentRoomId)
        ])];

        const payload = {
            eventType,
            ticketId: String(ticket._id),
            ticketNumber: ticket.ticketNumber,
            systemId: String(ticket.systemId),
            environmentId: String(ticket.environmentId),
            subEnvironmentId: String(ticket.subEnvironmentId),
            currentRoomId: String(ticket.currentRoomId),
            visibleRoomIds,
            status: ticket.status,
            version: ticket.version,
            updatedAt: ticket.updatedAt
        };

        try {
            const rooms = [...new Set([
                `system:${payload.systemId}`,
                `environment:${payload.environmentId}`,
                `subEnvironment:${payload.subEnvironmentId}`,
                ...visibleRoomIds.map((roomId) => `room:${roomId}`)
            ])];

            const channel = this.io.to(rooms);
            channel.emit(eventType, payload);
            channel.emit('dashboard:invalidate', {
                ...payload,
                reason: eventType
            });
        } catch (error) {
            this.logger?.warn('ticket.realtime_publish_failed', {
                eventType,
                ticketId: payload.ticketId,
                reason: error?.code || 'publish_failed'
            });
        }
    }
}

module.exports = TicketRealtimePublisher;
