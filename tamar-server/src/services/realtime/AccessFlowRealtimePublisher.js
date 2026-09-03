const { ROLES } = require('../../domain/access/constants.js');

class AccessFlowRealtimePublisher {
    constructor({ personalNumberService }) {
        this.io = null;
        this.personalNumberService = personalNumberService;
    }

    setIo(io) {
        this.io = io;
    }

    requesterRooms({ identity, userId } = {}) {
        const rooms = [];
        if (identity) {
            rooms.push(this.personalNumberService.identityRoom(identity));
        }
        if (userId) rooms.push(`user:${userId}`);
        return rooms;
    }

    reviewerRooms(request) {
        const rooms = [];

        if (request?.systemId) {
            rooms.push(`reviewer:system:${request.systemId}`);
        }

        if (
            request?.environmentId
            && [
                ROLES.SYSTEM_ADMIN,
                ROLES.ROOM_MANAGER,
                ROLES.ROOM_USER
            ].includes(request.requestedRole)
        ) {
            rooms.push(`reviewer:environment:${request.environmentId}`);
        }

        if (
            request?.subEnvironmentId
            && [ROLES.ROOM_MANAGER, ROLES.ROOM_USER]
                .includes(request.requestedRole)
        ) {
            rooms.push(
                `reviewer:subEnvironment:${request.subEnvironmentId}`
            );
        }

        if (
            request?.roomId
            && request.requestedRole === ROLES.ROOM_USER
        ) {
            rooms.push(`reviewer:room:${request.roomId}`);
        }

        return [...new Set(rooms)];
    }

    userManagementRooms(user) {
        const rooms = new Set();

        for (const membership of user?.memberships || []) {
            const requestLike = {
                requestedRole: membership.role,
                systemId: membership.systemId,
                environmentId: membership.environmentId,
                subEnvironmentId: membership.subEnvironmentId,
                roomId: membership.roomId
            };

            this.reviewerRooms(requestLike).forEach((room) => {
                rooms.add(room);
            });
        }

        return [...rooms];
    }

    emitToRooms(eventName, payload, rooms) {
        if (!this.io) return;
        const uniqueRooms = [...new Set((rooms || []).filter(Boolean))];
        if (!uniqueRooms.length) return;
        this.io.to(uniqueRooms).emit(eventName, payload);
    }

    emitToRequester(eventName, payload, target) {
        this.emitToRooms(
            eventName,
            payload,
            this.requesterRooms(target)
        );
    }

    emitToReviewers(eventName, payload, request) {
        this.emitToRooms(
            eventName,
            payload,
            this.reviewerRooms(request)
        );
    }

    requestCreated(request, target) {
        const payload = {
            id: String(request._id),
            status: request.status
        };

        this.emitToRequester(
            'access-request:created',
            payload,
            target
        );
        this.emitToReviewers(
            'access-request:created',
            payload,
            request
        );
    }

    requestUpdated(request, target) {
        const payload = {
            id: String(request._id),
            status: request.status
        };

        this.emitToRequester(
            'access-request:updated',
            payload,
            target
        );
        this.emitToReviewers(
            'access-request:updated',
            payload,
            request
        );
    }

    permissionsUpdated(request, target) {
        this.emitToRequester(
            'permissions:updated',
            {
                accessRequestId: String(request._id),
                userId: target?.userId
                    ? String(target.userId)
                    : undefined
            },
            target
        );
    }

    userPermissionsUpdated(user) {
        if (!user?.id) return;

        const payload = {
            userId: String(user.id),
            updatedAt: user.updatedAt || new Date().toISOString()
        };

        // The changed user is the only non-reviewer that receives this event.
        this.emitToRooms(
            'permissions:updated',
            payload,
            [`user:${user.id}`]
        );

        // Management screens receive a separate invalidation event through
        // reviewer-only rooms. ROOM_USER sockets never join these rooms.
        this.emitToRooms(
            'user-management:updated',
            payload,
            this.userManagementRooms(user)
        );
    }
}

module.exports = AccessFlowRealtimePublisher;
