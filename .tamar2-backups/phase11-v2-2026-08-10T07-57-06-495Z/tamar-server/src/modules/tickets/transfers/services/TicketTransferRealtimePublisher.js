class TicketTransferRealtimePublisher {
    constructor({ logger }) { this.logger = logger; this.io = null; }
    setIo(io) { this.io = io; }

    publish(eventType, transfer, ticket, { endedAssigneeCount = 0 } = {}) {
        if (!this.io) return;
        const resolvedAt = transfer.acceptedAt || transfer.cancelledAt || null;
        const payload = {
            eventType,
            transferId: String(transfer._id),
            ticketId: String(transfer.ticketId),
            ticketNumber: transfer.ticketNumber,
            systemId: String(transfer.systemId),
            sourceSubEnvironmentId: String(transfer.sourceSubEnvironmentId),
            sourceRoomId: String(transfer.sourceRoomId),
            destinationSubEnvironmentId: String(transfer.destinationSubEnvironmentId),
            destinationRoomId: String(transfer.destinationRoomId),
            transferStatus: transfer.status,
            ticketStatus: ticket.status,
            ticketVersion: ticket.version,
            initiatedAt: transfer.initiatedAt,
            resolvedAt,
            endedAssigneeCount
        };
        const rooms = new Set([
            `system:${payload.systemId}`,
            `subEnvironment:${payload.sourceSubEnvironmentId}`,
            `room:${payload.sourceRoomId}`,
            `subEnvironment:${payload.destinationSubEnvironmentId}`,
            `room:${payload.destinationRoomId}`
        ]);
        try {
            for (const room of rooms) {
                this.io.to(room).emit(eventType, payload);
                this.io.to(room).emit('ticket:updated', payload);
                this.io.to(room).emit('ticket:history:created', payload);
                if (eventType === 'transfer:initiated' && endedAssigneeCount > 0) {
                    this.io.to(room).emit('assignment:updated', {
                        ...payload, activeAssigneeCount: 0, addedCount: 0, removedCount: endedAssigneeCount
                    });
                }
            }
        } catch (error) {
            this.logger?.warn('ticket.transfer_realtime_publish_failed', {
                eventType, ticketId: payload.ticketId, transferId: payload.transferId,
                reason: error?.code || 'publish_failed'
            });
        }
    }
}

module.exports = TicketTransferRealtimePublisher;
