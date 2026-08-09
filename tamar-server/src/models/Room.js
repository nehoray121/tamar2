const mongoose = require('mongoose');
const {
    normalizeOrganizationDescription,
    normalizeOrganizationKey,
    normalizeOrganizationName,
    validateOrganizationLifecycle
} = require('../domain/organization/validators.js');

const roomSchema = new mongoose.Schema({
    systemId: { type: mongoose.Schema.Types.ObjectId, ref: 'System', required: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Environment', required: true },
    subEnvironmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubEnvironment', required: true },
    key: { type: String, required: true, set: normalizeOrganizationKey },
    name: { type: String, required: true, set: normalizeOrganizationName },
    description: { type: String, set: normalizeOrganizationDescription },
    isActive: { type: Boolean, default: true, required: true },
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    collection: 'rooms',
    timestamps: true,
    optimisticConcurrency: true
});

roomSchema.pre('validate', function validateRoom() {
    validateOrganizationLifecycle(this);
});

roomSchema.index({ subEnvironmentId: 1, key: 1 }, { name: 'uniq_room_key_per_sub_environment', unique: true });
roomSchema.index(
    { systemId: 1, environmentId: 1, subEnvironmentId: 1, isActive: 1, archivedAt: 1 },
    { name: 'room_lineage_lifecycle_lookup' }
);

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

module.exports = Room;
