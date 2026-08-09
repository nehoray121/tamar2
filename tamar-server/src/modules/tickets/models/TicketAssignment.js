const mongoose = require('mongoose');
const AppError = require('../../../errors/AppError.js');
const {
    ASSIGNMENT_END_REASONS, ASSIGNMENT_END_REASON_VALUES, ASSIGNMENT_SOURCE_VALUES
} = require('../domain/assignmentConstants.js');

const objectId = mongoose.Schema.Types.ObjectId;
const metadataIsSafe = (value) => {
    const visit = (entry, depth) => {
        if (entry === null || typeof entry === 'boolean') return true;
        if (typeof entry === 'number') return Number.isFinite(entry);
        if (typeof entry === 'string') return entry.length <= 500;
        if (depth >= 4 || typeof entry !== 'object') return false;
        if (Array.isArray(entry)) return entry.length <= 50 && entry.every((item) => visit(item, depth + 1));
        if (![Object.prototype, null].includes(Object.getPrototypeOf(entry))) return false;
        const keys = Object.keys(entry);
        return keys.length <= 50 && keys.every((key) => (
            !['__proto__', 'constructor', 'prototype'].includes(key)
            && !key.startsWith('$')
            && !key.includes('.')
            && visit(entry[key], depth + 1)
        ));
    };
    if (!value || Array.isArray(value) || !visit(value, 0)) return false;
    try { return JSON.stringify(value).length <= 2048; } catch { return false; }
};

const ticketAssignmentSchema = new mongoose.Schema({
    ticketId: { type: objectId, ref: 'Ticket', required: true, immutable: true },
    ticketNumber: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    systemId: { type: objectId, ref: 'System', required: true, immutable: true },
    environmentId: { type: objectId, ref: 'Environment', required: true, immutable: true },
    subEnvironmentId: { type: objectId, ref: 'SubEnvironment', required: true, immutable: true },
    roomId: { type: objectId, ref: 'Room', required: true, immutable: true },
    userId: { type: objectId, ref: 'User', required: true, immutable: true },
    assignedBy: { type: objectId, ref: 'User', required: true, immutable: true },
    assignedAt: { type: Date, required: true, immutable: true },
    assignmentSource: { type: String, enum: ASSIGNMENT_SOURCE_VALUES, required: true, immutable: true },
    isActive: { type: Boolean, required: true, default: true },
    endedAt: { type: Date, default: null },
    endedBy: { type: objectId, ref: 'User', default: null },
    endedReason: { type: String, enum: ASSIGNMENT_END_REASON_VALUES, default: null },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({}),
        validate: { validator: metadataIsSafe, message: 'Assignment metadata must be a bounded safe object' }
    }
}, {
    collection: 'ticketAssignments', timestamps: true, strict: 'throw', versionKey: false
});

ticketAssignmentSchema.pre('validate', function validateAssignmentState() {
    if (this.isActive) {
        if (this.endedAt || this.endedBy || this.endedReason) throw new Error('Active assignment cannot contain ending metadata');
        return;
    }
    if (!this.endedAt || !this.endedBy || !this.endedReason) {
        throw new Error('Ended assignment requires endedAt, endedBy and endedReason');
    }
});

const assignmentHistoryError = (code, message) => {
    throw new AppError({ statusCode: 405, code, message });
};
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate']) {
    ticketAssignmentSchema.pre(hook, function preventAssignmentReopen() {
        const update = this.getUpdate() || {};
        if (update.isActive === true || update.$set?.isActive === true) {
            assignmentHistoryError('ASSIGNMENT_REOPEN_FORBIDDEN', 'Ended assignments cannot be reopened');
        }
    });
}
for (const hook of ['deleteOne', 'deleteMany', 'findOneAndDelete']) {
    ticketAssignmentSchema.pre(hook, () => assignmentHistoryError(
        'ASSIGNMENT_HISTORY_IMMUTABLE', 'Assignment history cannot be deleted'
    ));
}

ticketAssignmentSchema.index(
    { ticketId: 1, userId: 1 },
    { name: 'uniq_active_ticket_assignee', unique: true, partialFilterExpression: { isActive: true } }
);
ticketAssignmentSchema.index({ ticketId: 1, isActive: 1, assignedAt: 1 }, { name: 'assignment_ticket_active_chronology' });
ticketAssignmentSchema.index({ userId: 1, isActive: 1, assignedAt: 1 }, { name: 'assignment_user_active_chronology' });
ticketAssignmentSchema.index({ roomId: 1, isActive: 1, assignedAt: 1 }, { name: 'assignment_room_active_chronology' });
ticketAssignmentSchema.index({ ticketId: 1, assignedAt: 1, _id: 1 }, { name: 'assignment_ticket_history' });
ticketAssignmentSchema.index({ assignedBy: 1, assignedAt: 1 }, { name: 'assignment_actor_chronology' });

const TicketAssignment = mongoose.models.TicketAssignment
    || mongoose.model('TicketAssignment', ticketAssignmentSchema);

module.exports = TicketAssignment;
