const { ticketError, ticketNotFound } = require('../../domain/errors.js');

const escapedRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pagination = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    return { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };
};

class TicketTransferTargetService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async list(userId, ticketId, query) {
        const [access, ticket] = await Promise.all([
            this.authorizationService.resolveAccess(userId),
            this.ticketRepository.findById(ticketId)
        ]);
        if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
        if (ticket.status !== 'OPEN') throw ticketError(409, 'TRANSFER_TICKET_NOT_OPEN', 'Only an open Ticket may be transferred');
        if (ticket.activeTransferId) throw ticketError(409, 'TRANSFER_ALREADY_PENDING', 'A pending Transfer already exists');
        if (!this.authorizationService.canTransfer(access, ticket)) throw ticketError(403, 'TRANSFER_INITIATION_FORBIDDEN', 'You cannot transfer this Ticket');
        const search = query.search ? new RegExp(escapedRegex(query.search), 'iu') : undefined;
        const result = await this.targetRepository.list({
            systemId: ticket.systemId,
            excludedRoomId: ticket.currentRoomId,
            environmentId: query.environmentId,
            subEnvironmentId: query.subEnvironmentId,
            search,
            page: query.page,
            limit: query.limit
        });
        return {
            items: result.items.map((item) => ({
                id: String(item._id), key: item.key, name: item.name,
                environment: { id: String(item.environment._id), name: item.environment.name },
                subEnvironment: { id: String(item.subEnvironment._id), name: item.subEnvironment.name }
            })),
            pagination: pagination(query.page, query.limit, result.totalItems),
            appliedFilters: {
                search: query.search || undefined,
                environmentId: query.environmentId,
                subEnvironmentId: query.subEnvironmentId
            }
        };
    }
}

module.exports = TicketTransferTargetService;
