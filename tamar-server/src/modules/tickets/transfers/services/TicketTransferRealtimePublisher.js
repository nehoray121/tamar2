class TicketTransferRealtimePublisher {
    constructor({ logger }) {
        this.logger = logger;
        this.io = null;
    }

    setIo(io) {
        this.io = io;
    }

    publish(
        eventType,
        transfer,
        ticket,
        { endedAssigneeCount = 0 } = {}
    ) {
        if (!this.io) return;

        const resolvedAt = transfer.acceptedAt
            || transfer.cancelledAt
            || null;

        const payload = {
            eventType,
            transferId: String(transfer._id),
            ticketId: String(transfer.ticketId),
            ticketNumber: transfer.ticketNumber,
            systemId: String(transfer.systemId),
            sourceEnvironmentId: String(
                transfer.sourceEnvironmentId
            ),
            sourceSubEnvironmentId: String(
                transfer.sourceSubEnvironmentId
            ),
            sourceRoomId: String(transfer.sourceRoomId),
            destinationEnvironmentId: String(
                transfer.destinationEnvironmentId
            ),
            destinationSubEnvironmentId: String(
                transfer.destinationSubEnvironmentId
            ),
            destinationRoomId: String(
                transfer.destinationRoomId
            ),
            currentRoomId: String(ticket.currentRoomId),
            visibleRoomIds: (ticket.visibleRoomIds || []).map(String),
            transferStatus: transfer.status,
            ticketStatus: ticket.status,
            ticketVersion: ticket.version,
            initiatedAt: transfer.initiatedAt,
            resolvedAt,
            endedAssigneeCount
        };

        const rooms = [...new Set([
            `system:${payload.systemId}`,
            `environment:${payload.sourceEnvironmentId}`,
            `subEnvironment:${payload.sourceSubEnvironmentId}`,
            `room:${payload.sourceRoomId}`,
            `environment:${payload.destinationEnvironmentId}`,
            `subEnvironment:${payload.destinationSubEnvironmentId}`,
            `room:${payload.destinationRoomId}`
        ])];

        try {
            const channel = this.io.to(rooms);
            channel.emit(eventType, payload);
            channel.emit('ticket:updated', payload);
            channel.emit('ticket:history:created', payload);
            channel.emit('dashboard:invalidate', {
                ...payload,
                reason: eventType
            });

            if (
                eventType === 'transfer:initiated'
                && endedAssigneeCount > 0
            ) {
                channel.emit('assignment:updated', {
                    ...payload,
                    activeAssigneeCount: 0,
                    addedCount: 0,
                    removedCount: endedAssigneeCount
                });
            }
        } catch (error) {
            this.logger?.warn(
                'ticket.transfer_realtime_publish_failed',
                {
                    eventType,
                    ticketId: payload.ticketId,
                    transferId: payload.transferId,
                    reason: error?.code || 'publish_failed'
                }
            );
        }
    }
}

module.exports = TicketTransferRealtimePublisher;
