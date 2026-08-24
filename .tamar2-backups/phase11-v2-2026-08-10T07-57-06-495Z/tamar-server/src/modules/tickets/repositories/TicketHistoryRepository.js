const TicketHistory = require('../models/TicketHistory.js');
const { ticketError } = require('../domain/errors.js');

class TicketHistoryRepository {
    async append(payload, { session } = {}) {
        try {
            const [entry] = await TicketHistory.create([payload], { session });
            return entry;
        } catch (error) {
            if (error?.hasErrorLabel?.('TransientTransactionError')) throw error;
            throw ticketError(500, 'TICKET_HISTORY_WRITE_FAILED', 'Unable to append ticket history');
        }
    }

    async list(ticketId, { page, limit, sortDirection = 'asc', session } = {}) {
        const filter = { ticketId };
        const [items, totalItems] = await Promise.all([
            TicketHistory.find(filter).sort({ createdAt: sortDirection === 'desc' ? -1 : 1, _id: sortDirection === 'desc' ? -1 : 1 })
                .skip((page - 1) * limit).limit(limit).session(session || null).lean().exec(),
            TicketHistory.countDocuments(filter).session(session || null).exec()
        ]);
        return { items, totalItems };
    }
}

module.exports = TicketHistoryRepository;
