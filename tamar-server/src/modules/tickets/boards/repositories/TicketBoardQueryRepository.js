const Ticket = require('../../models/Ticket.js');
const TicketTransfer = require('../../transfers/models/TicketTransfer.js');

class TicketBoardQueryRepository {
    async aggregateTickets(pipeline) {
        return Ticket.aggregate(pipeline).option({ maxTimeMS: 5000 }).exec();
    }

    async aggregateTransfers(pipeline) {
        return TicketTransfer.aggregate(pipeline).option({ maxTimeMS: 5000 }).exec();
    }
}

module.exports = TicketBoardQueryRepository;
