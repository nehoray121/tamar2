const AppError = require('../errors/AppError.js');
const User = require('../models/User.js');

const selectProtection = (query, include) => include ? query.select('+personalNumberLookupHash +personalNumberLast4') : query;

class UserRepository {
    async findById(userId, { session, includeIdentityProtection = false } = {}) {
        return selectProtection(User.findById(userId).session(session || null), includeIdentityProtection).exec();
    }
    async findActiveById(userId, options = {}) {
        return User.findOne({ _id: userId, isActive: true }).session(options.session || null).exec();
    }
    async findByIds(userIds, options = {}) {
        return User.find({ _id: { $in: userIds } }).session(options.session || null).lean().exec();
    }
    async findSummariesByIds(userIds, options = {}) {
        return User.find({ _id: { $in: userIds } }).select('_id displayName email')
            .session(options.session || null).lean().exec();
    }
    async findByExternalIdentity(provider, subject, options = {}) {
        const query = User.findOne({
            'externalIdentity.provider': String(provider).trim().toLowerCase(),
            'externalIdentity.subject': String(subject).trim()
        }).session(options.session || null);
        return selectProtection(query, options.includeIdentityProtection).exec();
    }
    async findByPersonalNumberLookupHash(hash, options = {}) {
        const query = User.findOne({ personalNumberLookupHash: hash }).session(options.session || null);
        return selectProtection(query, options.includeIdentityProtection).exec();
    }
    async bindExternalIdentity(userId, auth, options = {}) {
        return User.findOneAndUpdate(
            { _id: userId, $or: [{ externalIdentity: { $exists: false } }, { 'externalIdentity.provider': { $exists: false }, 'externalIdentity.subject': { $exists: false } }] },
            { $set: { externalIdentity: { provider: auth.provider, subject: auth.subject }, lastIdentitySyncAt: new Date() } },
            { returnDocument: 'after', session: options.session }
        ).select('+personalNumberLookupHash +personalNumberLast4').exec();
    }
    async findOrCreateFromIdentitySnapshot(snapshot, options = {}) {
        try {
            return await User.findOneAndUpdate(
                { personalNumberLookupHash: snapshot.personalNumberLookupHash },
                { $setOnInsert: {
                    personalNumberLookupHash: snapshot.personalNumberLookupHash,
                    personalNumberLast4: snapshot.personalNumberLast4,
                    externalIdentity: { provider: snapshot.provider, subject: snapshot.subject },
                    displayName: snapshot.displayName || 'Organizational user',
                    email: snapshot.email,
                    isActive: true,
                    lastIdentitySyncAt: new Date()
                } },
                { upsert: true, returnDocument: 'after', runValidators: true, session: options.session }
            ).select('+personalNumberLookupHash +personalNumberLast4').exec();
        } catch (error) {
            if (error?.code === 11000) throw new AppError({ statusCode: 409, code: 'IDENTITY_BINDING_CONFLICT', message: 'The verified identity conflicts with another Tamar user', cause: error });
            throw error;
        }
    }
    async create(payload, options = {}) {
        const [user] = await User.create([payload], { session: options.session });
        return user;
    }
}

module.exports = UserRepository;
