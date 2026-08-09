const mongoose = require('mongoose');
const TicketBoardCategory = require('../models/TicketBoardCategory.js');
const TicketBoardItemState = require('../models/TicketBoardItemState.js');
const { BOARD_TYPES, TICKET_BOARD_TYPES } = require('../domain/board.constants.js');
const { boardError, categoryNotFound } = require('../domain/board.errors.js');
const { toTicketBoardItem, toTransferBoardItem } = require('../domain/board.dto.js');
const { deriveExternalState } = require('../../transfers/domain/transfer.dto.js');

const objectId = (value) => new mongoose.Types.ObjectId(String(value));
const escapedRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const range = (from, to) => ({ ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) });
const pagination = (page, limit, totalItems) => ({
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    hasNextPage: page * limit < totalItems,
    hasPreviousPage: page > 1
});

class TicketBoardQueryService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    stateLookup(roomId, boardType, localField, stateField) {
        return {
            $lookup: {
                from: TicketBoardItemState.collection.name,
                let: { itemId: `$${localField}` },
                pipeline: [{ $match: { $expr: { $and: [
                    { $eq: ['$roomId', objectId(roomId)] },
                    { $eq: ['$boardType', boardType] },
                    { $eq: [`$${stateField}`, '$$itemId'] }
                ] } } }],
                as: '_boardStates'
            }
        };
    }

    categoryLookup() {
        return {
            $lookup: {
                from: TicketBoardCategory.collection.name,
                localField: '_boardState.categoryId',
                foreignField: '_id',
                as: '_boardCategories'
            }
        };
    }

    stateStages(roomId, boardType, localField, stateField, query) {
        const stages = [
            this.stateLookup(roomId, boardType, localField, stateField),
            { $set: { _boardState: { $first: '$_boardStates' } } }
        ];
        const stateMatch = [];
        if (query.categoryId) stateMatch.push({ '_boardState.categoryId': objectId(query.categoryId) });
        if (query.categoryMode === 'CATEGORIZED') stateMatch.push({ '_boardState.categoryId': { $ne: null } });
        if (query.categoryMode === 'UNCATEGORIZED') stateMatch.push({ $or: [
            { _boardState: null }, { '_boardState.categoryId': null }
        ] });
        if (query.pinMode === 'PINNED') stateMatch.push({ '_boardState.isPinned': true });
        if (query.pinMode === 'UNPINNED') stateMatch.push({ $or: [
            { _boardState: null }, { '_boardState.isPinned': { $ne: true } }
        ] });
        if (stateMatch.length) stages.push({ $match: { $and: stateMatch } });
        stages.push(
            this.categoryLookup(),
            { $set: {
                _boardCategory: { $first: '$_boardCategories' },
                _isPinned: { $cond: ['$_boardState.isPinned', 1, 0] },
                _pinnedAt: { $ifNull: ['$_boardState.pinnedAt', new Date(0)] }
            } }
        );
        return stages;
    }

    finalStages(query, sortField) {
        const direction = query.sortDirection === 'asc' ? 1 : -1;
        const sort = { _isPinned: -1, _pinnedAt: -1 };
        if (sortField !== '_pinnedAt') sort[sortField] = direction;
        sort._id = direction;
        return [
            { $sort: sort },
            { $facet: {
                items: [{ $skip: (query.page - 1) * query.limit }, { $limit: query.limit }],
                total: [{ $count: 'count' }]
            } }
        ];
    }

    ticketPipeline(roomId, boardType, query) {
        const match = boardType === BOARD_TYPES.OPEN
            ? { status: 'OPEN', activeTransferId: null, currentRoomId: objectId(roomId) }
            : { status: 'CLOSED', visibleRoomIds: objectId(roomId) };
        if (query.priority) match.priority = query.priority;
        if (query.createdBy) match.createdBy = objectId(query.createdBy);
        if (query.createdFrom || query.createdTo) match.createdAt = range(query.createdFrom, query.createdTo);
        if (query.updatedFrom || query.updatedTo) match.updatedAt = range(query.updatedFrom, query.updatedTo);
        if (query.closedFrom || query.closedTo) match.closedAt = range(query.closedFrom, query.closedTo);
        if (query.search) {
            const search = new RegExp(escapedRegex(query.search), 'iu');
            match.$or = [{ ticketNumber: search }, { subject: search }, { description: search }];
            if (boardType === BOARD_TYPES.CLOSED) match.$or.push({ closureSummary: search });
        }
        const sortField = query.sortBy === 'pinnedAt' ? '_pinnedAt' : query.sortBy;
        return [
            { $match: match },
            ...this.stateStages(roomId, boardType, '_id', 'ticketId', query),
            ...this.finalStages(query, sortField)
        ];
    }

    transferPipeline(roomId, boardType, query) {
        const match = boardType === BOARD_TYPES.EXTERNAL_SENT
            ? { sourceRoomId: objectId(roomId) } : { destinationRoomId: objectId(roomId) };
        if (query.transferStatus) match.status = query.transferStatus;
        if (query.initiatedFrom || query.initiatedTo) match.initiatedAt = range(query.initiatedFrom, query.initiatedTo);
        if (query.resolvedFrom || query.resolvedTo) match.$or = [
            { acceptedAt: range(query.resolvedFrom, query.resolvedTo) },
            { cancelledAt: range(query.resolvedFrom, query.resolvedTo) }
        ];
        const afterTicket = [];
        if (query.externalState) afterTicket.push({ $match: { _externalState: query.externalState } });
        if (query.search) {
            const search = new RegExp(escapedRegex(query.search), 'iu');
            afterTicket.push({ $match: { $or: [
                { ticketNumber: search }, { transferReason: search }, { '_ticket.subject': search }
            ] } });
        }
        const sortField = query.sortBy === 'pinnedAt' ? '_pinnedAt' : query.sortBy;
        return [
            { $match: match },
            { $lookup: { from: 'tickets', localField: 'ticketId', foreignField: '_id', as: '_tickets' } },
            { $set: { _ticket: { $first: '$_tickets' } } },
            { $match: { _ticket: { $ne: null } } },
            { $set: { _externalState: { $switch: {
                branches: [
                    { case: { $eq: ['$status', 'PENDING_ACCEPTANCE'] }, then: 'PENDING' },
                    { case: { $eq: ['$status', 'CANCELLED'] }, then: 'CANCELLED' },
                    { case: { $eq: ['$_ticket.status', 'CLOSED'] }, then: 'DONE' }
                ],
                default: 'PROCESSING'
            } } } },
            ...afterTicket,
            ...this.stateStages(roomId, boardType, '_id', 'transferId', query),
            ...this.finalStages(query, sortField)
        ];
    }

    async validateCategoryFilter(roomId, boardType, categoryId) {
        if (!categoryId) return;
        const category = await this.categoryRepository.findScoped(categoryId, roomId, boardType);
        if (!category) throw categoryNotFound();
    }

    async list(actorId, roomId, boardType, query) {
        await this.authorizationService.authorize(actorId, roomId, boardType);
        await this.validateCategoryFilter(roomId, boardType, query.categoryId);
        const ticketBoard = TICKET_BOARD_TYPES.includes(boardType);
        const pipeline = ticketBoard
            ? this.ticketPipeline(roomId, boardType, query)
            : this.transferPipeline(roomId, boardType, query);
        const [result] = ticketBoard
            ? await this.queryRepository.aggregateTickets(pipeline)
            : await this.queryRepository.aggregateTransfers(pipeline);
        const capabilities = this.capabilityService.forAuthorizedItem(true);
        const items = (result?.items || []).map((item) => ticketBoard
            ? toTicketBoardItem(item, boardType, roomId, item._boardState, item._boardCategory, capabilities)
            : toTransferBoardItem(
                item, item._ticket, boardType, roomId, item._boardState,
                item._boardCategory, capabilities, deriveExternalState(item, item._ticket)
            ));
        const totalItems = result?.total?.[0]?.count || 0;
        return {
            items,
            pagination: pagination(query.page, query.limit, totalItems),
            appliedFilters: { ...query, search: query.search || undefined },
            sort: { sortBy: query.sortBy, sortDirection: query.sortDirection },
            capabilities
        };
    }
}

module.exports = TicketBoardQueryService;
