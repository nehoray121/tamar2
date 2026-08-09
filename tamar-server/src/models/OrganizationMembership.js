const mongoose = require('mongoose');
const { ROLE_VALUES, SCOPE_TYPE_VALUES } = require('../domain/access/constants.js');
const { assertHierarchyReferences } = require('../domain/access/validators.js');

const organizationMembershipSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ROLE_VALUES, required: true },
    scopeType: { type: String, enum: SCOPE_TYPE_VALUES, required: true },
    scopeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    systemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    environmentId: mongoose.Schema.Types.ObjectId,
    subEnvironmentId: mongoose.Schema.Types.ObjectId,
    roomId: mongoose.Schema.Types.ObjectId,
    isActive: { type: Boolean, default: true, required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokedAt: Date,
    revocationReason: { type: String, trim: true, maxlength: 500 }
}, {
    collection: 'organizationMemberships',
    timestamps: true,
    optimisticConcurrency: true
});

organizationMembershipSchema.pre('validate', function validateMembership() {
    assertHierarchyReferences(this);

    if (this.isActive && (this.revokedAt || this.revokedBy)) {
        throw new Error('Active membership cannot contain revocation metadata');
    }
    if (!this.isActive && (!this.revokedAt || !this.revokedBy)) {
        throw new Error('Revoked membership requires revokedAt and revokedBy');
    }
});

organizationMembershipSchema.index(
    { userId: 1, role: 1, scopeType: 1, scopeId: 1 },
    {
        name: 'uniq_active_membership',
        unique: true,
        partialFilterExpression: { isActive: true }
    }
);

organizationMembershipSchema.index(
    { userId: 1, isActive: 1, role: 1 },
    { name: 'membership_access_lookup' }
);

organizationMembershipSchema.index(
    { subEnvironmentId: 1, roomId: 1, role: 1, isActive: 1 },
    { name: 'membership_scope_lookup' }
);

const OrganizationMembership = mongoose.models.OrganizationMembership
    || mongoose.model('OrganizationMembership', organizationMembershipSchema);

module.exports = OrganizationMembership;
