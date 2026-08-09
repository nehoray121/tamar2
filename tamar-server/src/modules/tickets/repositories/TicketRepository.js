const Ticket = require('../models/Ticket.js');

class TicketRepository {
    async create(payload, { session } = {}) {
        const [ticket] = await Ticket.create([payload], { session });
        return ticket;
    }

    async findById(id, { session, lean = true } = {}) {
        const query = Ticket.findById(id).session(session || null);
        return (lean ? query.lean() : query).exec();
    }

    async findManyByIds(ids, { session } = {}) {
        return Ticket.find({ _id: { $in: ids } }).session(session || null).lean().exec();
    }

    async list(filter, { page, limit, sort, session } = {}) {
        const [items, totalItems] = await Promise.all([
            Ticket.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).maxTimeMS(5000).session(session || null).lean().exec(),
            Ticket.countDocuments(filter).maxTimeMS(5000).session(session || null).exec()
        ]);
        return { items, totalItems };
    }

    async updateOpen(id, expectedVersion, updates, { session } = {}) {
        return Ticket.findOneAndUpdate(
            { _id: id, status: 'OPEN', version: expectedVersion, activeTransferId: null },
            { $set: updates, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true, session }
        ).lean().exec();
    }

    async close(id, expectedVersion, closure, { session } = {}) {
        return Ticket.findOneAndUpdate(
            { _id: id, status: 'OPEN', version: expectedVersion, activeTransferId: null },
            { $set: closure, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true, session }
        ).lean().exec();
    }

    async replaceAssigneesOpen(id, expectedVersion, activeAssigneeIds, { session } = {}) {
        return Ticket.findOneAndUpdate(
            { _id: id, status: 'OPEN', version: expectedVersion, activeTransferId: null },
            { $set: { activeAssigneeIds }, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true, session }
        ).lean().exec();
    }

    async beginTransfer(id, expectedVersion, updates, { session } = {}) {
        return Ticket.findOneAndUpdate(
            { _id: id, status: 'OPEN', version: expectedVersion, activeTransferId: null },
            { $set: updates, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true, session }
        ).lean().exec();
    }

    async resolveTransfer(id, expectedVersion, activeTransferId, currentRoomId, updates, { session } = {}) {
        return Ticket.findOneAndUpdate(
            { _id: id, status: 'OPEN', version: expectedVersion, activeTransferId, currentRoomId },
            { $set: updates, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true, session }
        ).lean().exec();
    }
}

module.exports = TicketRepository;
