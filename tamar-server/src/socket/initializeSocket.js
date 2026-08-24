const { Server: SocketServer } = require('socket.io');
const { createSocketOptions } = require('../config/socket.js');
const { ROLES } = require('../domain/access/constants.js');

const dataRoomForMembership = (membership) => {
    if (!membership) return null;

    if (membership.role === ROLES.SUPER_ADMIN && membership.systemId) {
        return `system:${membership.systemId}`;
    }

    if (
        ROLES.ENVIRONMENT_ADMIN
        && membership.role === ROLES.ENVIRONMENT_ADMIN
        && membership.environmentId
    ) {
        return `environment:${membership.environmentId}`;
    }

    if (membership.role === ROLES.SYSTEM_ADMIN && membership.subEnvironmentId) {
        return `subEnvironment:${membership.subEnvironmentId}`;
    }

    if (
        [ROLES.ROOM_MANAGER, ROLES.ROOM_USER].includes(membership.role)
        && membership.roomId
    ) {
        return `room:${membership.roomId}`;
    }

    return null;
};

const reviewerRoomForMembership = (membership) => {
    if (!membership) return null;

    if (membership.role === ROLES.SUPER_ADMIN && membership.systemId) {
        return `reviewer:system:${membership.systemId}`;
    }

    if (
        ROLES.ENVIRONMENT_ADMIN
        && membership.role === ROLES.ENVIRONMENT_ADMIN
        && membership.environmentId
    ) {
        return `reviewer:environment:${membership.environmentId}`;
    }

    if (membership.role === ROLES.SYSTEM_ADMIN && membership.subEnvironmentId) {
        return `reviewer:subEnvironment:${membership.subEnvironmentId}`;
    }

    if (membership.role === ROLES.ROOM_MANAGER && membership.roomId) {
        return `reviewer:room:${membership.roomId}`;
    }

    return null;
};

const organizationRoomsForAccess = (access) => {
    const rooms = new Set();

    for (const membership of access?.memberships || []) {
        const dataRoom = dataRoomForMembership(membership);
        const reviewerRoom = reviewerRoomForMembership(membership);
        if (dataRoom) rooms.add(dataRoom);
        if (reviewerRoom) rooms.add(reviewerRoom);
    }

    return [...rooms];
};

const joinOrganizationRooms = async (socket, access) => {
    const rooms = organizationRoomsForAccess(access);
    await Promise.all(rooms.map((room) => socket.join(room)));
    return rooms;
};

const scheduleTokenExpiry = (socket, expiresAt, toleranceSeconds) => {
    const expirationTime = expiresAt instanceof Date
        ? expiresAt.getTime()
        : new Date(expiresAt).getTime();

    if (!Number.isFinite(expirationTime)) return;

    const disconnectAt = expirationTime + Number(toleranceSeconds || 0) * 1000;

    const expire = () => {
        try {
            socket.emit('auth:token-expired', {
                expiresAt: new Date(expirationTime).toISOString()
            });
        } catch {}

        const timer = setTimeout(() => {
            socket.disconnect(true);
        }, 25);
        timer.unref?.();
        socket.data.tokenExpiryTimer = timer;
    };

    const arm = () => {
        const remaining = disconnectAt - Date.now();
        if (remaining <= 0) {
            expire();
            return;
        }

        const timer = setTimeout(
            arm,
            Math.min(remaining, 2147483647)
        );
        timer.unref?.();
        socket.data.tokenExpiryTimer = timer;
    };

    arm();
};

const initializeSocket = ({ httpServer, config, logger, services }) => {
    const io = new SocketServer(
        httpServer,
        createSocketOptions(config.clientOrigins)
    );

    if (services?.auth) {
        io.use(async (socket, next) => {
            try {
                const token = services.auth.accessTokenVerifier
                    .extractFromSocket(socket);
                const { claims } = await services.auth.accessTokenVerifier
                    .verify(token);
                const auth = services.auth.claimsMapper.mapVerifiedClaims(
                    claims
                );
                const user = await services.auth.authenticatedIdentityService
                    .resolveUser(auth);

                if (user && !user.isActive) throw new Error('disabled');

                socket.data.auth = auth;
                if (user) socket.data.userId = String(user._id);

                await socket.join(
                    services.auth.personalNumberService.identityRoom(auth)
                );

                if (user) {
                    await socket.join(`user:${user._id}`);

                    const access = await services.scopeResolver
                        .resolveEffectiveAccess(user._id);

                    if (access.isActive && access.memberships.length > 0) {
                        await joinOrganizationRooms(socket, access);
                    }

                    socket.data.organizationAccessLoadedAt = (
                        new Date().toISOString()
                    );
                }

                scheduleTokenExpiry(
                    socket,
                    auth.tokenExpiresAt,
                    config.auth.clockToleranceSeconds
                );
                next();
            } catch (error) {
                logger.warn('socket.authentication_failed', {
                    socketId: socket.id,
                    reason: error.safeReason || error.code || 'invalid'
                });
                next(new Error('AUTHENTICATION_REQUIRED'));
            }
        });
    }

    io.on('connection', (socket) => {
        logger.info('socket.connected', {
            socketId: socket.id,
            userId: socket.data.userId
        });

        socket.on('disconnect', (reason) => {
            if (socket.data.tokenExpiryTimer) {
                clearTimeout(socket.data.tokenExpiryTimer);
                socket.data.tokenExpiryTimer = null;
            }

            logger.info('socket.disconnected', {
                socketId: socket.id,
                userId: socket.data.userId,
                reason
            });
        });
    });

    return io;
};

const closeSocket = (io) => new Promise((resolve) => {
    if (!io) {
        resolve();
        return;
    }

    for (const socket of io.sockets.sockets.values()) {
        if (socket.data.tokenExpiryTimer) {
            clearTimeout(socket.data.tokenExpiryTimer);
        }
    }

    io.close(() => resolve());
});

module.exports = {
    closeSocket,
    initializeSocket,
    scheduleTokenExpiry,
    joinOrganizationRooms,
    organizationRoomsForAccess,
    dataRoomForMembership,
    reviewerRoomForMembership
};
