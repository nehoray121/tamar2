const AppError = require('../errors/AppError.js');
const Room = require('../models/Room.js');

const duplicateError = (cause) => new AppError({
    statusCode: 409,
    code: 'DUPLICATE_ROOM_KEY',
    message: 'Room key already exists in this SubEnvironment',
    cause
});

class RoomRepository {
    async create(payload, options = {}) {
        try {
            const [entity] = await Room.create([payload], { session: options.session });
            return entity;
        } catch (error) {
            if (error?.code === 11000) throw duplicateError(error);
            throw error;
        }
    }

    async findById(id, options = {}) {
        return Room.findById(id).session(options.session || null).lean().exec();
    }

    async findOperationalById(id, options = {}) {
        return Room.findOne({ _id: id, isActive: true, archivedAt: null })
            .session(options.session || null).lean().exec();
    }

    async findBySubEnvironmentIds(subEnvironmentIds, { operationalOnly = false, session } = {}) {
        const query = { subEnvironmentId: { $in: subEnvironmentIds } };
        if (operationalOnly) Object.assign(query, { isActive: true, archivedAt: null });
        return Room.find(query).session(session || null).lean().exec();
    }

    async findByEnvironmentId(environmentId, { operationalOnly = false, session } = {}) {
        const query = { environmentId };
        if (operationalOnly) Object.assign(query, { isActive: true, archivedAt: null });
        return Room.find(query).session(session || null).lean().exec();
    }

    async findBySystemIds(systemIds, { operationalOnly = false, session } = {}) {
        const query = { systemId: { $in: systemIds } };
        if (operationalOnly) Object.assign(query, { isActive: true, archivedAt: null });
        return Room.find(query).session(session || null).lean().exec();
    }

    async countActiveBySubEnvironmentId(subEnvironmentId, options = {}) {
        return Room.countDocuments({ subEnvironmentId, isActive: true, archivedAt: null })
            .session(options.session || null).exec();
    }

    async updateById(id, updates, options = {}) {
        return Room.findByIdAndUpdate(id, { $set: updates }, {
            returnDocument: 'after', runValidators: true, session: options.session
        }).exec();
    }
}

module.exports = RoomRepository;
