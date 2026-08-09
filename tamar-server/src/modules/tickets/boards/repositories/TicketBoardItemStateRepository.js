const TicketBoardItemState = require('../models/TicketBoardItemState.js');

class TicketBoardItemStateRepository {
    async findByIdentity(identity) { return TicketBoardItemState.findOne(identity).lean().exec(); }

    async createVersionOne(identity, mutation) {
        return TicketBoardItemState.findOneAndUpdate(
            { ...identity, version: { $exists: false } },
            { $setOnInsert: { ...identity, ...mutation, version: 1 } },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ).lean().exec();
    }

    async updateVersioned(identity, expectedVersion, mutation) {
        return TicketBoardItemState.findOneAndUpdate(
            { ...identity, version: expectedVersion },
            { $set: mutation, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true }
        ).lean().exec();
    }

    async aggregate(pipeline) {
        return TicketBoardItemState.aggregate(pipeline).option({ maxTimeMS: 5000 }).exec();
    }
}

module.exports = TicketBoardItemStateRepository;
