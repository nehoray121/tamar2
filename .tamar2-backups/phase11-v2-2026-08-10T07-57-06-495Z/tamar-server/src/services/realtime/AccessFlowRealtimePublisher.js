const { ROLES } = require('../../domain/access/constants.js');

class AccessFlowRealtimePublisher {
    constructor({ personalNumberService }) {
        this.io = null;
        this.personalNumberService = personalNumberService;
    }
    setIo(io) { this.io = io; }
    requesterRooms({ identity, userId }) {
        const rooms = [this.personalNumberService.identityRoom(identity)];
        if (userId) rooms.push(`user:${userId}`);
        return rooms;
    }
    reviewerRooms(request) {
        const rooms = [`system:${request.systemId}`];
        if ([ROLES.ROOM_MANAGER, ROLES.ROOM_USER].includes(request.requestedRole)) {
            rooms.push(`subEnvironment:${request.subEnvironmentId}`);
        }
        if (request.requestedRole === ROLES.ROOM_USER) rooms.push(`room:${request.roomId}`);
        return rooms.filter((room) => !room.endsWith(':null') && !room.endsWith(':undefined'));
    }
    emitToRooms(eventName, payload, rooms) {
        if (!this.io) return;
        for (const room of new Set(rooms)) this.io.to(room).emit(eventName, payload);
    }
    emitToRequester(eventName, payload, target) {
        this.emitToRooms(eventName, payload, this.requesterRooms(target));
    }
    emitToReviewers(eventName, payload, request) {
        this.emitToRooms(eventName, payload, this.reviewerRooms(request));
    }
    requestCreated(request, target) {
        const payload = { id: String(request._id), status: request.status };
        this.emitToRequester('access-request:created', payload, target);
        this.emitToReviewers('access-request:created', payload, request);
    }
    requestUpdated(request, target) {
        const payload = { id: String(request._id), status: request.status };
        this.emitToRequester('access-request:updated', payload, target);
        this.emitToReviewers('access-request:updated', payload, request);
    }
    permissionsUpdated(request, target) {
        this.emitToRequester('permissions:updated', { accessRequestId: String(request._id) }, target);
    }
}

module.exports = AccessFlowRealtimePublisher;