const TicketSequence = require('../models/TicketSequence.js');
const { ticketError } = require('../domain/errors.js');

class TicketSequenceRepository {
    async allocate(systemId, { session } = {}) {
        try {
            const sequence = await TicketSequence.findOneAndUpdate(
                { systemId }, { $inc: { value: 1 } },
                { upsert: true, returnDocument: 'after', runValidators: true, session }
            ).lean().exec();
            if (!sequence?.value) throw new Error('Sequence allocation returned no value');
            return sequence.value;
        } catch (error) {
            if (error?.hasErrorLabel?.('TransientTransactionError')) throw error;
            if (error?.code === 'TICKET_NUMBER_ALLOCATION_FAILED') throw error;
            throw ticketError(500, 'TICKET_NUMBER_ALLOCATION_FAILED', 'Unable to allocate a ticket number');
        }
    }
}

module.exports = TicketSequenceRepository;
