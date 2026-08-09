const { Server: SocketServer } = require('socket.io');
const { createSocketOptions } = require('../config/socket.js');
const { ROLES } = require('../domain/access/constants.js');

const joinOrganizationRooms = async (socket, access) => {
    const rooms = new Set();
    for (const membership of access.memberships) {
        if (membership.role === ROLES.SUPER_ADMIN) rooms.add(`system:${membership.systemId}`);
        else if (membership.role === ROLES.SYSTEM_ADMIN) rooms.add(`subEnvironment:${membership.subEnvironmentId}`);
        else if ([ROLES.ROOM_MANAGER, ROLES.ROOM_USER].includes(membership.role)) rooms.add(`room:${membership.roomId}`);
    }
    await Promise.all([...rooms].map((room) => socket.join(room)));
};

const scheduleTokenExpiry = (socket, expiresAt, toleranceSeconds) => {
    const disconnectAt = expiresAt.getTime() + toleranceSeconds * 1000;
    const arm = () => {
        const remaining = disconnectAt - Date.now();
        if (remaining <= 0) { socket.disconnect(true); return; }
        const timer = setTimeout(arm, Math.min(remaining, 2147483647));
        timer.unref?.();
        socket.data.tokenExpiryTimer = timer;
    };
    arm();
};

const initializeSocket = ({ httpServer, config, logger, services }) => {
    const io = new SocketServer(httpServer, createSocketOptions(config.clientOrigins));
    if (services?.auth) {
        io.use(async (socket, next) => {
            try {
                const token = services.auth.accessTokenVerifier.extractFromSocket(socket);
                const { claims } = await services.auth.accessTokenVerifier.verify(token);
                const auth = services.auth.claimsMapper.mapVerifiedClaims(claims);
                const user = await services.auth.authenticatedIdentityService.resolveUser(auth);
                if (user && !user.isActive) throw new Error('disabled');
                socket.data.auth = auth;
                if (user) socket.data.userId = String(user._id);
                socket.join(services.auth.personalNumberService.identityRoom(auth));
                if (user) socket.join(`user:${user._id}`);
                if (user) {
                    const access = await services.scopeResolver.resolveEffectiveAccess(user._id);
                    if (access.isActive && access.memberships.length > 0) await joinOrganizationRooms(socket, access);
                    socket.data.organizationAccessLoadedAt = new Date().toISOString();
                }
                scheduleTokenExpiry(socket, auth.tokenExpiresAt, config.auth.clockToleranceSeconds);
                next();
            } catch (error) {
                logger.warn('socket.authentication_failed', { socketId: socket.id, reason: error.safeReason || error.code || 'invalid' });
                next(new Error('AUTHENTICATION_REQUIRED'));
            }
        });
    }
    io.on('connection', (socket) => {
        logger.info('socket.connected', { socketId: socket.id, userId: socket.data.userId });
        socket.on('disconnect', (reason) => {
            if (socket.data.tokenExpiryTimer) clearTimeout(socket.data.tokenExpiryTimer);
            logger.info('socket.disconnected', { socketId: socket.id, userId: socket.data.userId, reason });
        });
    });
    return io;
};
const closeSocket = (io) => new Promise((resolve) => {
    if (!io) { resolve(); return; }
    for (const socket of io.sockets.sockets.values()) if (socket.data.tokenExpiryTimer) clearTimeout(socket.data.tokenExpiryTimer);
    io.close(() => resolve());
});

module.exports = { closeSocket, initializeSocket, scheduleTokenExpiry };
