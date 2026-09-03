class TicketBoardRealtimePublisher {
    constructor({ logger }) {
        this.logger = logger;
        this.io = null;
    }

    setIo(io) {
        this.io = io;
    }

    rooms(entity) {
        return [...new Set([
            `system:${entity.systemId}`,
            `environment:${entity.environmentId}`,
            `subEnvironment:${entity.subEnvironmentId}`,
            `room:${entity.roomId}`
        ])];
    }

    publishCategory(eventType, category) {
        if (!this.io) return;

        const payload = {
            eventType,
            categoryId: String(category._id),
            systemId: String(category.systemId),
            environmentId: String(category.environmentId),
            subEnvironmentId: String(category.subEnvironmentId),
            roomId: String(category.roomId),
            boardType: category.boardType,
            categoryVersion: category.version,
            isActive: Boolean(category.isActive),
            updatedAt: category.updatedAt
        };

        this.safeEmit(eventType, payload, payload.categoryId);
    }

    publishState(state) {
        if (!this.io) return;

        const payload = {
            eventType: 'board:item-state-updated',
            itemType: state.itemType,
            ticketId: String(state.ticketId),
            transferId: state.transferId
                ? String(state.transferId)
                : undefined,
            systemId: String(state.systemId),
            environmentId: String(state.environmentId),
            subEnvironmentId: String(state.subEnvironmentId),
            roomId: String(state.roomId),
            boardType: state.boardType,
            stateVersion: state.version,
            hasCategory: Boolean(state.categoryId),
            isPinned: Boolean(state.isPinned),
            updatedAt: state.updatedAt
        };

        this.safeEmit(
            payload.eventType,
            payload,
            payload.transferId || payload.ticketId
        );
    }

    safeEmit(eventType, payload, entityId) {
        try {
            for (const room of this.rooms(payload)) {
                this.io.to(room).emit(eventType, payload);
            }
        } catch (error) {
            this.logger?.warn('ticket.board_realtime_publish_failed', {
                eventType,
                entityId,
                reason: error?.code || 'publish_failed'
            });
        }
    }
}

module.exports = TicketBoardRealtimePublisher;
