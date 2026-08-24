const AppError = require('../errors/AppError.js');
const SubEnvironment = require('../models/SubEnvironment.js');

const duplicateError = (cause) => new AppError({
    statusCode: 409,
    code: 'DUPLICATE_SUB_ENVIRONMENT_KEY',
    message: 'SubEnvironment key already exists in this Environment',
    cause
});

class SubEnvironmentRepository {
    async create(payload, options = {}) {
        try {
            const [entity] = await SubEnvironment.create([payload], { session: options.session });
            return entity;
        } catch (error) {
            if (error?.code === 11000) throw duplicateError(error);
            throw error;
        }
    }

    async findById(id, options = {}) {
        return SubEnvironment.findById(id).session(options.session || null).lean().exec();
    }

    async findOperationalById(id, options = {}) {
        return SubEnvironment.findOne({ _id: id, isActive: true, archivedAt: null })
            .session(options.session || null).lean().exec();
    }

    async findByEnvironmentId(environmentId, { operationalOnly = false, session } = {}) {
        return this.findByEnvironmentIds([environmentId], { operationalOnly, session });
    }

    async findBySystemIds(systemIds, { operationalOnly = false, session } = {}) {
        const query = { systemId: { $in: systemIds } };
        if (operationalOnly) Object.assign(query, { isActive: true, archivedAt: null });
        return SubEnvironment.find(query).session(session || null).lean().exec();
    }

    async findByEnvironmentIds(environmentIds, { operationalOnly = false, session } = {}) {
        const query = { environmentId: { $in: environmentIds } };
        if (operationalOnly) Object.assign(query, { isActive: true, archivedAt: null });
        return SubEnvironment.find(query).session(session || null).lean().exec();
    }

    async countActiveByEnvironmentId(environmentId, options = {}) {
        return SubEnvironment.countDocuments({ environmentId, isActive: true, archivedAt: null })
            .session(options.session || null).exec();
    }

    async updateById(id, updates, options = {}) {
        return SubEnvironment.findByIdAndUpdate(id, { $set: updates }, {
            returnDocument: 'after',
            runValidators: true,
            session: options.session
        }).exec();
    }
}

module.exports = SubEnvironmentRepository;
