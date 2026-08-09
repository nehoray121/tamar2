class TicketBoardCapabilityService {
    forAuthorizedItem(eligible) {
        return {
            canChangeCategory: Boolean(eligible),
            canChangePin: Boolean(eligible)
        };
    }
}

module.exports = TicketBoardCapabilityService;
