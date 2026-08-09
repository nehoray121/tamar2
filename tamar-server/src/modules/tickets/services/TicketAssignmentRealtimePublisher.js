class TicketAssignmentRealtimePublisher {
    constructor({ logger }) { this.logger = logger; this.io = null; }
    setIo(io) { this.io = io; }

    publish(change) {
        if (!this.io) return;
        const payload = {
            ticketId: String(change.ticket._id),
            ticketNumber: change.ticket.ticketNumber,
            systemId: String(change.ticket.systemId),
            subEnvironmentId: String(change.ticket.subEnvironmentId),
            currentRoomId: String(change.ticket.currentRoomId),
            version: change.ticket.version,
            activeAssigneeCount: change.ticket.activeAssigneeIds.length,
            addedCount: change.addedIds.length,
            removedCount: change.removedIds.length,
            updatedAt: change.ticket.updatedAt
        };
        try {
            for (const room of [
                `system:${payload.systemId}`,
                `subEnvironment:${payload.subEnvironmentId}`,
                `room:${payload.currentRoomId}`
            ]) this.io.to(room).emit('assignment:updated', payload);
        } catch (error) {
            this.logger?.warn('ticket.assignment_realtime_publish_failed', {
                ticketId: payload.ticketId, reason: error?.code || 'publish_failed'
            });
        }
    }
}

module.exports = TicketAssignmentRealtimePublisher;
