class OrganizationRealtimePublisher {
    constructor({ logger }) {
        this.logger = logger;
        this.io = null;
    }

    setIo(io) {
        this.io = io;
    }

    entityRooms(entity) {
        return [...new Set([
            entity.systemId ? `system:${entity.systemId}` : null,
            entity.environmentId ? `environment:${entity.environmentId}` : null,
            entity.subEnvironmentId
                ? `subEnvironment:${entity.subEnvironmentId}`
                : null,
            entity.roomId ? `room:${entity.roomId}` : null
        ].filter(Boolean))];
    }

    publish(eventType, entity, extra = {}) {
        if (!this.io) return;
        const payload = {
            eventType,
            entityId: String(entity._id || entity.id),
            systemId: entity.systemId ? String(entity.systemId) : undefined,
            environmentId: entity.environmentId
                ? String(entity.environmentId)
                : undefined,
            subEnvironmentId: entity.subEnvironmentId
                ? String(entity.subEnvironmentId)
                : undefined,
            roomId: entity.roomId
                ? String(entity.roomId)
                : undefined,
            updatedAt: entity.updatedAt || entity.createdAt || new Date(),
            ...extra
        };

        try {
            for (const room of this.entityRooms(payload)) {
                this.io.to(room).emit(eventType, payload);
            }
        } catch (error) {
            this.logger?.warn('organization.realtime_publish_failed', {
                eventType,
                entityId: payload.entityId,
                reason: error?.code || 'publish_failed'
            });
        }
    }

    environmentCreated(entity) {
        this.publish('organization:environment-created', entity, {
            entityType: 'ENVIRONMENT'
        });
    }

    subEnvironmentCreated(entity) {
        this.publish('organization:sub-environment-created', entity, {
            entityType: 'SUB_ENVIRONMENT'
        });
    }

    roomCreated(entity) {
        this.publish('organization:room-created', entity, {
            entityType: 'ROOM'
        });
    }

    settingsUpdated(setting) {
        this.publish('settings:updated', setting, {
            entityType: 'ROOM_SETTINGS',
            version: setting.version
        });
    }
}

module.exports = OrganizationRealtimePublisher;
