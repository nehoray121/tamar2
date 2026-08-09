class TicketAssigneeSummaryService {
    constructor({ userRepository }) { this.userRepository = userRepository; }

    async mapByIds(ids, options = {}) {
        const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
        if (!uniqueIds.length) return new Map();
        const users = await this.userRepository.findSummariesByIds(uniqueIds, options);
        return new Map(users.map((user) => [String(user._id), {
            id: String(user._id), displayName: user.displayName, email: user.email || null
        }]));
    }

    async forTicket(ticket, options = {}) {
        const map = await this.mapByIds(ticket.activeAssigneeIds || [], options);
        return (ticket.activeAssigneeIds || []).map((value) => map.get(String(value))).filter(Boolean);
    }

    async forTickets(tickets, options = {}) {
        const map = await this.mapByIds(tickets.flatMap((ticket) => ticket.activeAssigneeIds || []), options);
        return new Map(tickets.map((ticket) => [String(ticket._id),
            (ticket.activeAssigneeIds || []).map((value) => map.get(String(value))).filter(Boolean)
        ]));
    }
}

module.exports = TicketAssigneeSummaryService;
