const mongoose = require('mongoose');
const {
    normalizeOrganizationDescription,
    normalizeOrganizationKey,
    normalizeOrganizationName,
    validateOrganizationLifecycle
} = require('../domain/organization/validators.js');

const systemSchema = new mongoose.Schema({
    key: { type: String, required: true, set: normalizeOrganizationKey },
    name: { type: String, required: true, set: normalizeOrganizationName },
    description: { type: String, set: normalizeOrganizationDescription },
    isActive: { type: Boolean, default: true, required: true },
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    collection: 'systems',
    timestamps: true,
    optimisticConcurrency: true
});

systemSchema.pre('validate', function validateSystem() {
    validateOrganizationLifecycle(this);
});

systemSchema.index({ key: 1 }, { name: 'uniq_system_key', unique: true });
systemSchema.index({ isActive: 1, archivedAt: 1 }, { name: 'system_lifecycle_lookup' });

const System = mongoose.models.System || mongoose.model('System', systemSchema);

module.exports = System;
