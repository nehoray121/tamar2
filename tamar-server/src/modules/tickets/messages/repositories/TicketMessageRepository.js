const TicketMessage = require('../models/TicketMessage.js');

class TicketMessageRepository {
    async create(payload) {
        const message = await TicketMessage.create(payload);
        return message.toObject();
    }

    findByIdempotency(ticketId, authorUserId, clientMessageId) {
        return TicketMessage.findOne({ ticketId, authorUserId, clientMessageId }).lean().exec();
    }

    findByTicketAndId(ticketId, messageId) {
        return TicketMessage.findOne({ _id: messageId, ticketId }).lean().exec();
    }

    async listBefore(ticketId, { before, limit }) {
        const filter = { ticketId };
        if (before) filter.$or = [
            { createdAt: { $lt: before.createdAt } },
            { createdAt: before.createdAt, _id: { $lt: before.id } }
        ];
        const rows = await TicketMessage.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .maxTimeMS(5000)
            .lean()
            .exec();
        return { rows: rows.slice(0, limit), hasMoreBefore: rows.length > limit };
    }

    editOwn(ticketId, messageId, authorUserId, expectedVersion, content, editedAt) {
        return TicketMessage.findOneAndUpdate(
            {
                _id: messageId, ticketId, authorUserId,
                version: expectedVersion, isDeleted: false
            },
            { $set: { content, isEdited: true, editedAt }, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true }
        ).lean().exec();
    }

    softDeleteOwn(ticketId, messageId, authorUserId, expectedVersion, deletedAt) {
        return TicketMessage.findOneAndUpdate(
            {
                _id: messageId, ticketId, authorUserId,
                version: expectedVersion, isDeleted: false
            },
            {
                $set: {
                    content: null, isDeleted: true, deletedAt, deletedBy: authorUserId
                },
                $inc: { version: 1 }
            },
            { returnDocument: 'after', runValidators: true }
        ).lean().exec();
    }
}

module.exports = TicketMessageRepository;
