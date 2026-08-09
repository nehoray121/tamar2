const TicketBoardCategory = require('../models/TicketBoardCategory.js');
const { boardError } = require('../domain/board.errors.js');

const translateDuplicate = (error) => {
    if (error?.code === 11000) {
        throw boardError(409, 'BOARD_CATEGORY_DUPLICATE', 'An active category with this name already exists');
    }
    throw error;
};

class TicketBoardCategoryRepository {
    async create(payload) {
        try { return await TicketBoardCategory.create(payload); } catch (error) { return translateDuplicate(error); }
    }

    async findById(id) { return TicketBoardCategory.findById(id).lean().exec(); }

    async findScoped(id, roomId, boardType) {
        return TicketBoardCategory.findOne({ _id: id, roomId, boardType }).lean().exec();
    }

    async list(filter, { page, limit, sort }) {
        const [items, totalItems] = await Promise.all([
            TicketBoardCategory.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean().exec(),
            TicketBoardCategory.countDocuments(filter).exec()
        ]);
        return { items, totalItems };
    }

    async updateActive(id, roomId, boardType, expectedVersion, updates) {
        try {
            return await TicketBoardCategory.findOneAndUpdate(
                { _id: id, roomId, boardType, isActive: true, version: expectedVersion },
                { $set: updates, $inc: { version: 1 } },
                { returnDocument: 'after', runValidators: true }
            ).lean().exec();
        } catch (error) { return translateDuplicate(error); }
    }

    async archiveActive(id, roomId, boardType, expectedVersion, actorId, archivedAt) {
        return TicketBoardCategory.findOneAndUpdate(
            { _id: id, roomId, boardType, isActive: true, version: expectedVersion },
            { $set: { isActive: false, archivedAt, archivedBy: actorId, updatedBy: actorId }, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true }
        ).lean().exec();
    }
}

module.exports = TicketBoardCategoryRepository;
