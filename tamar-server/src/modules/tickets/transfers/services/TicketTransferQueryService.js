const mongoose = require('mongoose');
const { ticketNotFound } = require('../../domain/errors.js');
const { transferNotFound } = require('../domain/transfer.errors.js');
const { toRoomSummary, toTicketSummary, toTransferDto } = require('../domain/transfer.dto.js');

const objectId = (value) => new mongoose.Types.ObjectId(String(value));
const escapedRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pagination = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    return { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };
};
const castDirectionFilter = (filter) => {
    if (filter.$or) return { $or: filter.$or.map(castDirectionFilter) };
    const result = { ...filter };
    for (const key of ['systemId', 'sourceRoomId', 'destinationRoomId']) {
        if (result[key]?.$in) result[key] = { $in: result[key].$in.map(objectId) };
    }
    return result;
};

class TicketTransferQueryService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    transferCapabilities(access, ticket, transfer) {
        return this.capabilityService.forTicket(access, ticket,
            transfer.status === 'PENDING_ACCEPTANCE' ? transfer : null);
    }

    async actorSummaries(transfers) {
        return this.userSummaryService.mapByIds(transfers.flatMap((transfer) => [
            transfer.initiatedBy, transfer.acceptedBy, transfer.cancelledBy
        ]));
    }

    async list(userId, query) {
        const access = await this.authorizationService.resolveAccess(userId);
        const conditions = [castDirectionFilter(this.transferAuthorizationService.buildDirectionFilter(access, query.direction))];
        for (const key of ['ticketId', 'sourceRoomId', 'destinationRoomId', 'sourceSubEnvironmentId', 'destinationSubEnvironmentId']) {
            if (query[key]) conditions.push({ [key]: objectId(query[key]) });
        }
        if (query.status) conditions.push({ status: query.status });
        if (query.initiatedFrom || query.initiatedTo) conditions.push({ initiatedAt: {
            ...(query.initiatedFrom ? { $gte: query.initiatedFrom } : {}),
            ...(query.initiatedTo ? { $lte: query.initiatedTo } : {})
        } });
        if (query.resolvedFrom || query.resolvedTo) {
            const range = {
                ...(query.resolvedFrom ? { $gte: query.resolvedFrom } : {}),
                ...(query.resolvedTo ? { $lte: query.resolvedTo } : {})
            };
            conditions.push({ $or: [{ acceptedAt: range }, { cancelledAt: range }] });
        }
        const direction = query.sortDirection === 'asc' ? 1 : -1;
        const result = await this.transferRepository.list({ $and: conditions }, {
            page: query.page,
            limit: query.limit,
            sort: { [query.sortBy]: direction, _id: direction },
            search: query.search ? new RegExp(escapedRegex(query.search), 'iu') : undefined,
            externalState: query.externalState
        });
        const transfers = result.items;
        const summaries = await this.actorSummaries(transfers);
        return {
            items: transfers.map((transfer) => {
                const ticket = transfer._ticket;
                return {
                    transfer: toTransferDto(transfer, {
                        ticket,
                        capabilities: this.transferCapabilities(access, ticket, transfer),
                        userSummaries: summaries
                    }),
                    ticket: toTicketSummary(ticket)
                };
            }),
            pagination: pagination(query.page, query.limit, result.totalItems),
            appliedFilters: { ...query, search: query.search || undefined },
            sort: { sortBy: query.sortBy, sortDirection: query.sortDirection }
        };
    }

    async detail(userId, transferId) {
        const [access, transfer] = await Promise.all([
            this.authorizationService.resolveAccess(userId),
            this.transferRepository.findById(transferId)
        ]);
        if (!transfer || !this.transferAuthorizationService.canView(access, transfer)) throw transferNotFound();
        const ticket = await this.ticketRepository.findById(transfer.ticketId);
        if (!ticket || !this.authorizationService.canView(access, ticket)) throw transferNotFound();
        const [rooms, summaries] = await Promise.all([
            Promise.all([
                this.organization.roomRepository.findById(transfer.sourceRoomId),
                this.organization.roomRepository.findById(transfer.destinationRoomId)
            ]),
            this.actorSummaries([transfer])
        ]);
        return {
            transfer: toTransferDto(transfer, {
                ticket,
                capabilities: this.transferCapabilities(access, ticket, transfer),
                userSummaries: summaries
            }),
            ticket: toTicketSummary(ticket),
            sourceRoom: toRoomSummary(rooms[0]),
            destinationRoom: toRoomSummary(rooms[1])
        };
    }

    async ticketHistory(userId, ticketId, query) {
        const [access, ticket] = await Promise.all([
            this.authorizationService.resolveAccess(userId),
            this.ticketRepository.findById(ticketId)
        ]);
        if (!ticket || !this.authorizationService.canView(access, ticket)) throw ticketNotFound();
        const result = await this.transferRepository.listForTicket(ticketId, query);
        const summaries = await this.actorSummaries(result.items);
        return {
            items: result.items.map((transfer) => toTransferDto(transfer, { ticket, userSummaries: summaries })),
            pagination: pagination(query.page, query.limit, result.totalItems),
            sort: { sortDirection: query.sortDirection },
            capabilities: this.capabilityService.forTicket(access, ticket,
                ticket.activeTransferId ? result.items.find((item) => String(item._id) === String(ticket.activeTransferId)) : null)
        };
    }
}

module.exports = TicketTransferQueryService;
