class TicketRealtimePublisher {
    constructor({ logger }) { this.logger = logger; this.io = null; }
    setIo(io) { this.io = io; }

    publish(eventType, ticket) {
        if (!this.io) return;
        const payload = {
            eventType,
            ticketId: String(ticket._id),
            ticketNumber: ticket.ticketNumber,
            systemId: String(ticket.systemId),
            subEnvironmentId: String(ticket.subEnvironmentId),
            currentRoomId: String(ticket.currentRoomId),
            status: ticket.status,
            version: ticket.version,
            updatedAt: ticket.updatedAt
        };
        try {
            for (const room of [
                `system:${payload.systemId}`,
                `subEnvironment:${payload.subEnvironmentId}`,
                `room:${payload.currentRoomId}`
            ]) this.io.to(room).emit(eventType, payload);
            this.io.to(`system:${payload.systemId}`).emit('dashboard:invalidate', {
                systemId: payload.systemId, ticketId: payload.ticketId, updatedAt: payload.updatedAt
            });
        } catch (error) {
            this.logger?.warn('ticket.realtime_publish_failed', {
                eventType, ticketId: payload.ticketId, reason: error?.code || 'publish_failed'
            });
        }
    }
}

module.exports = TicketRealtimePublisher;
