const { toMessageDto } = require('../domain/message.dto.js');
const { encodeMessageCursor } = require('../domain/message.cursor.js');

class TicketMessageQueryService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async list(userId, ticketId, query) {
        const ticket = await this.ticketRepository.findById(ticketId);
        await this.authorizationService.requireChatAccess(userId, ticket);
        const result = await this.messageRepository.listBefore(ticketId, query);
        const summaries = await this.userSummaryService.mapByIds(
            result.rows.map((message) => message.authorUserId)
        );
        const chronological = [...result.rows].reverse();
        return {
            items: chronological.map((message) => toMessageDto(message, {
                author: summaries.get(String(message.authorUserId)),
                capabilities: this.capabilityService.forMessage(userId, message, true)
            })),
            pageInfo: {
                limit: query.limit,
                hasMoreBefore: result.hasMoreBefore,
                nextBeforeCursor: result.hasMoreBefore && result.rows.length
                    ? encodeMessageCursor(result.rows[result.rows.length - 1])
                    : null
            }
        };
    }
}

module.exports = TicketMessageQueryService;
