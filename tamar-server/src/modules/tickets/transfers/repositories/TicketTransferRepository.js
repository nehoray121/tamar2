const mongoose = require('mongoose');
const TicketTransfer = require('../models/TicketTransfer.js');
const { TRANSFER_STATUSES } = require('../domain/transfer.constants.js');
const { transferError } = require('../domain/transfer.errors.js');

const objectId = (value) => new mongoose.Types.ObjectId(String(value));

class TicketTransferRepository {
    async create(payload, { session } = {}) {
        try {
            const [transfer] = await TicketTransfer.create([payload], { session });
            return transfer;
        } catch (error) {
            if (error?.hasErrorLabel?.('TransientTransactionError')) throw error;
            if (error?.code === 11000) {
                if (error?.message?.includes('uniq_pending_transfer_per_ticket')) {
                    throw transferError(409, 'TRANSFER_ALREADY_PENDING', 'A pending Transfer already exists for this Ticket');
                }
                throw transferError(409, 'TRANSFER_SEQUENCE_CONFLICT', 'Transfer sequence conflicts with existing history');
            }
            throw error;
        }
    }

    async findById(id, { session } = {}) {
        return TicketTransfer.findById(id).session(session || null).lean().exec();
    }

    async findManyByIds(ids, { session } = {}) {
        if (!ids.length) return [];
        return TicketTransfer.find({ _id: { $in: ids } }).session(session || null).lean().exec();
    }

    async findPendingByTicketId(ticketId, { session } = {}) {
        return TicketTransfer.findOne({ ticketId, status: TRANSFER_STATUSES.PENDING_ACCEPTANCE })
            .session(session || null).lean().exec();
    }

    async nextSequence(ticketId, { session } = {}) {
        const latest = await TicketTransfer.findOne({ ticketId }).sort({ sequence: -1 })
            .select('sequence').session(session || null).lean().exec();
        return (latest?.sequence || 0) + 1;
    }

    async acceptPending(id, payload, { session } = {}) {
        return TicketTransfer.findOneAndUpdate(
            { _id: id, status: TRANSFER_STATUSES.PENDING_ACCEPTANCE },
            { $set: { status: TRANSFER_STATUSES.ACCEPTED, ...payload } },
            { returnDocument: 'after', runValidators: true, session }
        ).lean().exec();
    }

    async cancelPending(id, payload, { session } = {}) {
        return TicketTransfer.findOneAndUpdate(
            { _id: id, status: TRANSFER_STATUSES.PENDING_ACCEPTANCE },
            { $set: { status: TRANSFER_STATUSES.CANCELLED, ...payload } },
            { returnDocument: 'after', runValidators: true, session }
        ).lean().exec();
    }

    async list(filter, { page, limit, sort, search, externalState } = {}) {
        const pipeline = [
            { $match: filter },
            { $lookup: { from: 'tickets', localField: 'ticketId', foreignField: '_id', as: '_ticket' } },
            { $unwind: '$_ticket' },
            { $addFields: { _externalState: { $switch: {
                branches: [
                    { case: { $eq: ['$status', TRANSFER_STATUSES.PENDING_ACCEPTANCE] }, then: 'PENDING' },
                    { case: { $eq: ['$status', TRANSFER_STATUSES.CANCELLED] }, then: 'CANCELLED' },
                    { case: { $eq: ['$_ticket.status', 'CLOSED'] }, then: 'DONE' }
                ],
                default: 'PROCESSING'
            } } } },
            ...(externalState ? [{ $match: { _externalState: externalState } }] : []),
            ...(search ? [{ $match: { $or: [
                { ticketNumber: search }, { transferReason: search }, { '_ticket.subject': search }
            ] } }] : []),
            { $sort: sort },
            { $facet: {
                items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                total: [{ $count: 'count' }]
            } }
        ];
        const [result] = await TicketTransfer.aggregate(pipeline).option({ maxTimeMS: 5000 }).exec();
        return { items: result?.items || [], totalItems: result?.total?.[0]?.count || 0 };
    }

    async listForTicket(ticketId, { page, limit, sortDirection } = {}) {
        const direction = sortDirection === 'desc' ? -1 : 1;
        const filter = { ticketId: objectId(ticketId) };
        const [items, totalItems] = await Promise.all([
            TicketTransfer.find(filter).sort({ sequence: direction, _id: direction })
                .skip((page - 1) * limit).limit(limit).lean().exec(),
            TicketTransfer.countDocuments(filter).exec()
        ]);
        return { items, totalItems };
    }
}

module.exports = TicketTransferRepository;
