const { BOARD_TYPES, itemTypeForBoard } = require('../domain/board.constants.js');
const { boardItemNotFound } = require('../domain/board.errors.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const includesId = (values, value) => (values || []).some((entry) => sameId(entry, value));

class TicketBoardEligibilityService {
    constructor({ ticketRepository, transferRepository }) {
        Object.assign(this, { ticketRepository, transferRepository });
    }

    ticketEligible(ticket, roomId, boardType) {
        if (boardType === BOARD_TYPES.OPEN) {
            return ticket?.status === 'OPEN' && !ticket.activeTransferId && sameId(ticket.currentRoomId, roomId);
        }
        if (boardType === BOARD_TYPES.CLOSED) {
            return ticket?.status === 'CLOSED' && includesId(ticket.visibleRoomIds, roomId);
        }
        return false;
    }

    transferEligible(transfer, roomId, boardType) {
        if (boardType === BOARD_TYPES.EXTERNAL_SENT) return sameId(transfer?.sourceRoomId, roomId);
        if (boardType === BOARD_TYPES.EXTERNAL_RECEIVED) return sameId(transfer?.destinationRoomId, roomId);
        return false;
    }

    async resolve(roomId, boardType, itemId) {
        if (itemTypeForBoard(boardType) === 'TICKET') {
            const ticket = await this.ticketRepository.findById(itemId);
            if (!this.ticketEligible(ticket, roomId, boardType)) throw boardItemNotFound();
            return { itemType: 'TICKET', ticket, transfer: null };
        }
        const transfer = await this.transferRepository.findById(itemId);
        if (!this.transferEligible(transfer, roomId, boardType)) throw boardItemNotFound();
        const ticket = await this.ticketRepository.findById(transfer.ticketId);
        if (!ticket) throw boardItemNotFound();
        return { itemType: 'TRANSFER', ticket, transfer };
    }

    identity(lineage, boardType, resolved) {
        return {
            systemId: lineage.system._id,
            environmentId: lineage.environment._id,
            subEnvironmentId: lineage.subEnvironment._id,
            roomId: lineage.room._id,
            boardType,
            itemType: resolved.itemType,
            ticketId: resolved.ticket._id,
            transferId: resolved.transfer?._id || null
        };
    }
}

module.exports = TicketBoardEligibilityService;
