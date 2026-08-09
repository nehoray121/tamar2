const AppError = require('../errors/AppError.js');
const Environment = require('../models/Environment.js');

const duplicateError = (cause) => new AppError({
    statusCode: 409,
    code: 'DUPLICATE_ENVIRONMENT_KEY',
    message: 'Environment key already exists in this System',
    cause
});

class EnvironmentRepository {
    async create(payload, options = {}) {
        try {
            const [entity] = await Environment.create([payload], { session: options.session });
            return entity;
        } catch (error) {
            if (error?.code === 11000) throw duplicateError(error);
            throw error;
        }
    }

    async findById(id, options = {}) {
        return Environment.findById(id).session(options.session || null).lean().exec();
    }

    async findOperationalById(id, options = {}) {
        return Environment.findOne({ _id: id, isActive: true, archivedAt: null })
            .session(options.session || null).lean().exec();
    }

    async findBySystemId(systemId, { operationalOnly = false, session } = {}) {
        const query = { systemId };
        if (operationalOnly) Object.assign(query, { isActive: true, archivedAt: null });
        return Environment.find(query).session(session || null).lean().exec();
    }

    async countActiveBySystemId(systemId, options = {}) {
        return Environment.countDocuments({ systemId, isActive: true, archivedAt: null })
            .session(options.session || null).exec();
    }

    async updateById(id, updates, options = {}) {
        return Environment.findByIdAndUpdate(id, { $set: updates }, {
            returnDocument: 'after', runValidators: true, session: options.session
        }).exec();
    }
}

module.exports = EnvironmentRepository;
