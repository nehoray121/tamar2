const { ticketNotFound } = require('../../domain/errors.js');

class TicketMessageAuthorizationService {
    constructor({ ticketAuthorizationService }) {
        this.ticketAuthorizationService = ticketAuthorizationService;
    }

    async requireChatAccess(userId, ticket) {
        const access = await this.ticketAuthorizationService.resolveAccess(userId);
        if (!ticket || !this.ticketAuthorizationService.canWriteChat(access, ticket)) {
            throw ticketNotFound();
        }
        return access;
    }
}

module.exports = TicketMessageAuthorizationService;
