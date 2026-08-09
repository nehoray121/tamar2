const mongoose = require('mongoose');
const {
    normalizeOrganizationDescription,
    normalizeOrganizationKey,
    normalizeOrganizationName,
    validateOrganizationLifecycle
} = require('../domain/organization/validators.js');

const environmentSchema = new mongoose.Schema({
    systemId: { type: mongoose.Schema.Types.ObjectId, ref: 'System', required: true },
    key: { type: String, required: true, set: normalizeOrganizationKey },
    name: { type: String, required: true, set: normalizeOrganizationName },
    description: { type: String, set: normalizeOrganizationDescription },
    isActive: { type: Boolean, default: true, required: true },
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    collection: 'environments',
    timestamps: true,
    optimisticConcurrency: true
});

environmentSchema.pre('validate', function validateEnvironment() {
    validateOrganizationLifecycle(this);
});

environmentSchema.index({ systemId: 1, key: 1 }, { name: 'uniq_environment_key_per_system', unique: true });
environmentSchema.index({ systemId: 1, isActive: 1, archivedAt: 1 }, { name: 'environment_system_lifecycle_lookup' });

const Environment = mongoose.models.Environment || mongoose.model('Environment', environmentSchema);

module.exports = Environment;
