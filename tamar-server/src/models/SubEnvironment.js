const mongoose = require('mongoose');
const {
    normalizeOrganizationDescription,
    normalizeOrganizationKey,
    normalizeOrganizationName,
    validateOrganizationLifecycle
} = require('../domain/organization/validators.js');

const subEnvironmentSchema = new mongoose.Schema({
    systemId: { type: mongoose.Schema.Types.ObjectId, ref: 'System', required: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Environment', required: true },
    key: { type: String, required: true, set: normalizeOrganizationKey },
    name: { type: String, required: true, set: normalizeOrganizationName },
    description: { type: String, set: normalizeOrganizationDescription },
    isActive: { type: Boolean, default: true, required: true },
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    collection: 'subEnvironments',
    timestamps: true,
    optimisticConcurrency: true
});

subEnvironmentSchema.pre('validate', function validateSubEnvironment() {
    validateOrganizationLifecycle(this);
});

subEnvironmentSchema.index({ environmentId: 1, key: 1 }, { name: 'uniq_sub_environment_key_per_environment', unique: true });
subEnvironmentSchema.index(
    { systemId: 1, environmentId: 1, isActive: 1, archivedAt: 1 },
    { name: 'sub_environment_lineage_lifecycle_lookup' }
);

const SubEnvironment = mongoose.models.SubEnvironment
    || mongoose.model('SubEnvironment', subEnvironmentSchema);

module.exports = SubEnvironment;
