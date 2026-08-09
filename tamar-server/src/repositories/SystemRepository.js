const AppError = require('../errors/AppError.js');
const System = require('../models/System.js');

const duplicateError = (cause) => new AppError({
    statusCode: 409,
    code: 'DUPLICATE_SYSTEM_KEY',
    message: 'System key already exists',
    cause
});

class SystemRepository {
    async create(payload, options = {}) {
        try {
            const [entity] = await System.create([payload], { session: options.session });
            return entity;
        } catch (error) {
            if (error?.code === 11000) throw duplicateError(error);
            throw error;
        }
    }

    async findById(id, options = {}) {
        return System.findById(id).session(options.session || null).lean().exec();
    }

    async findOperationalById(id, options = {}) {
        return System.findOne({ _id: id, isActive: true, archivedAt: null })
            .session(options.session || null).lean().exec();
    }

    async findOperational(options = {}) {
        return System.find({ isActive: true, archivedAt: null })
            .sort({ name: 1 }).session(options.session || null).lean().exec();
    }
    async updateById(id, updates, options = {}) {
        return System.findByIdAndUpdate(id, { $set: updates }, {
            returnDocument: 'after', runValidators: true, session: options.session
        }).exec();
    }
}

module.exports = SystemRepository;
