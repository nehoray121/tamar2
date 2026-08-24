const { boardError, boardNotFound } = require('../domain/board.errors.js');

const includesId = (values, value) => (values || []).some((item) => String(item) === String(value));

class TicketBoardAuthorizationService {
    constructor({ organization, scopeResolver }) { Object.assign(this, { organization, scopeResolver }); }

    async authorize(actorId, roomId, boardType) {
        let lineage;
        try {
            lineage = await this.organization.integrityService.resolveRoom(roomId, { requireOperational: true });
        } catch (error) {
if (error.code === 'ROOM_NOT_FOUND') throw boardNotFound();
            if (error.code === 'ORGANIZATION_SCOPE_INACTIVE') {
                throw boardError(403, 'BOARD_SCOPE_INACTIVE', 'Board scope is inactive');
            }
            throw error;
        }
        const access = await this.scopeResolver.resolveEffectiveAccess(actorId);
        if (!access?.isActive || !includesId(access.roomIds, roomId)) {
            throw boardError(403, 'BOARD_ACCESS_FORBIDDEN', 'Board access is forbidden');
        }
        return { access, boardType, lineage };
    }
}

module.exports = TicketBoardAuthorizationService;
