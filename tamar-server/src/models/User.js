const mongoose = require('mongoose');

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const externalIdentitySchema = new mongoose.Schema({
    provider: { type: String, trim: true, lowercase: true },
    subject: { type: String, trim: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
    externalIdentity: { type: externalIdentitySchema, default: undefined },
    personalNumberLookupHash: { type: String, select: false, match: HASH_PATTERN },
    personalNumberLast4: { type: String, select: false, maxlength: 4 },
    displayName: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true, required: true },
    lastLoginAt: Date,
    lastIdentitySyncAt: Date
}, {
    collection: 'users',
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
        transform: (_document, value) => {
            delete value.personalNumberLookupHash;
            delete value.personalNumberLast4;
            return value;
        }
    }
});

userSchema.index(
    { 'externalIdentity.provider': 1, 'externalIdentity.subject': 1 },
    { name: 'uniq_user_external_identity', unique: true, partialFilterExpression: { 'externalIdentity.provider': { $type: 'string' }, 'externalIdentity.subject': { $type: 'string' } } }
);
userSchema.index(
    { personalNumberLookupHash: 1 },
    { name: 'uniq_user_personal_number_lookup', unique: true, partialFilterExpression: { personalNumberLookupHash: { $type: 'string' } } }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
