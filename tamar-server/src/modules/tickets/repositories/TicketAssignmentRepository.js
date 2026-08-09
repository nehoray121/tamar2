const TicketAssignment = require('../models/TicketAssignment.js');
const { ticketError } = require('../domain/errors.js');

class TicketAssignmentRepository {
    async findActiveByTicketId(ticketId, { session } = {}) {
        return TicketAssignment.find({ ticketId, isActive: true })
            .sort({ assignedAt: 1, _id: 1 }).session(session || null).lean().exec();
    }

    async createMany(items, { session } = {}) {
        if (!items.length) return [];
        try {
            return await TicketAssignment.insertMany(items, { session, ordered: true });
        } catch (error) {
            if (error?.hasErrorLabel?.('TransientTransactionError')) throw error;
            if (error?.code === 11000) throw ticketError(409, 'ASSIGNMENT_DUPLICATE', 'An active assignment already exists');
            throw error;
        }
    }

    async endActive(ticketId, userIds, ending, { session } = {}) {
        if (!userIds.length) return { modifiedCount: 0 };
        return TicketAssignment.updateMany(
            { ticketId, userId: { $in: userIds }, isActive: true },
            { $set: { isActive: false, ...ending } },
            { session, runValidators: true }
        ).exec();
    }

    async list(ticketId, { view, page, limit, sortDirection, session } = {}) {
        const filter = { ticketId };
        if (view === 'ACTIVE') filter.isActive = true;
        if (view === 'HISTORY') filter.isActive = false;
        const direction = sortDirection === 'desc' ? -1 : 1;
        const [items, totalItems] = await Promise.all([
            TicketAssignment.find(filter).sort({ assignedAt: direction, _id: direction })
                .skip((page - 1) * limit).limit(limit).session(session || null).lean().exec(),
            TicketAssignment.countDocuments(filter).session(session || null).exec()
        ]);
        return { items, totalItems };
    }
}

module.exports = TicketAssignmentRepository;
