const mongoose = require('mongoose');
const {
    ACCESS_REQUEST_STATUSES,
    ACCESS_REQUEST_STATUS_VALUES,
    ACCESS_REQUEST_TYPE_VALUES,
    REQUESTABLE_ROLES,
    SCOPE_TYPE_VALUES
} = require('../domain/access/constants.js');
const { assertApprovedRoleNotHigher, assertHierarchyReferences, assertRequestRoleScopeCompatibility, normalizeExternalIdentity } = require('../domain/access/validators.js');

const identitySnapshotSchema = new mongoose.Schema({
    provider: { type: String, trim: true, lowercase: true, required: true },
    subject: { type: String, trim: true, required: true },
    personalNumberLookupHash: { type: String, select: false, match: /^[a-f0-9]{64}$/, required: true },
    personalNumberLast4: { type: String, select: false, maxlength: 4 },
    displayName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true }
}, { _id: false });

const accessRequestSchema = new mongoose.Schema({
    requesterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requesterIdentitySnapshot: { type: identitySnapshotSchema, required: true },
    requesterKey: { type: String, required: true, select: false, immutable: true },
    requestType: { type: String, enum: ACCESS_REQUEST_TYPE_VALUES, required: true },
    requestedRole: { type: String, enum: REQUESTABLE_ROLES, required: true },
    requestedScopeType: { type: String, enum: SCOPE_TYPE_VALUES, required: true },
    requestedScopeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    systemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    subEnvironmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    roomId: mongoose.Schema.Types.ObjectId,
    reason: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ACCESS_REQUEST_STATUS_VALUES, default: ACCESS_REQUEST_STATUSES.PENDING, required: true },
    assignedApproverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewComment: { type: String, trim: true, maxlength: 1000 },
    approvedRole: { type: String, enum: REQUESTABLE_ROLES },
    approvedScopeType: { type: String, enum: SCOPE_TYPE_VALUES },
    approvedScopeId: mongoose.Schema.Types.ObjectId,
    createdMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationMembership' }
}, { collection: 'accessRequests', timestamps: true, optimisticConcurrency: true });

accessRequestSchema.pre('validate', function validateAccessRequest() {
    assertRequestRoleScopeCompatibility(this.requestedRole, this.requestedScopeType);
    assertHierarchyReferences({
        role: this.requestedRole,
        scopeType: this.requestedScopeType,
        scopeId: this.requestedScopeId,
        systemId: this.systemId,
        environmentId: this.environmentId,
        subEnvironmentId: this.subEnvironmentId,
        roomId: this.roomId
    });
    const identity = normalizeExternalIdentity(this.requesterIdentitySnapshot);
    this.requesterIdentitySnapshot.provider = identity.provider;
    this.requesterIdentitySnapshot.subject = identity.subject;
    this.requesterKey = `identity:${this.requesterIdentitySnapshot.personalNumberLookupHash}`;
    const isApproved = [ACCESS_REQUEST_STATUSES.APPROVED, ACCESS_REQUEST_STATUSES.APPROVED_WITH_CHANGES].includes(this.status);
    if (isApproved) {
        assertApprovedRoleNotHigher(this.requestedRole, this.approvedRole);
        assertRequestRoleScopeCompatibility(this.approvedRole, this.approvedScopeType);
        if (!this.reviewedBy || !this.reviewedAt || !this.approvedScopeId || !this.createdMembershipId) throw new Error('Approved request requires reviewer, decision scope and created membership');
    }
});

accessRequestSchema.index(
    { requesterKey: 1, requestedRole: 1, requestedScopeType: 1, requestedScopeId: 1 },
    { name: 'uniq_pending_access_request', unique: true, partialFilterExpression: { status: ACCESS_REQUEST_STATUSES.PENDING } }
);
accessRequestSchema.index({ status: 1, createdAt: -1 }, { name: 'access_request_reviewer_queue' });
accessRequestSchema.index({ requestedScopeType: 1, requestedScopeId: 1, status: 1 }, { name: 'access_request_scope_lookup' });

const AccessRequest = mongoose.models.AccessRequest || mongoose.model('AccessRequest', accessRequestSchema);

module.exports = AccessRequest;
