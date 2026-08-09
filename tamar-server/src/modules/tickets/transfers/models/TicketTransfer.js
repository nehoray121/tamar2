const mongoose = require('mongoose');
const AppError = require('../../../../errors/AppError.js');
const { TRANSFER_STATUSES, TRANSFER_STATUS_VALUES } = require('../domain/transfer.constants.js');

const objectId = mongoose.Schema.Types.ObjectId;
const safeMetadata = (value) => {
    if (!value || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
    const visit = (entry, depth = 0) => {
        if (entry === null || typeof entry === 'boolean') return true;
        if (typeof entry === 'number') return Number.isFinite(entry);
        if (typeof entry === 'string') return entry.length <= 500;
        if (depth >= 4 || typeof entry !== 'object') return false;
        if (Array.isArray(entry)) return entry.length <= 50 && entry.every((item) => visit(item, depth + 1));
        if (![Object.prototype, null].includes(Object.getPrototypeOf(entry))) return false;
        const keys = Object.keys(entry);
        return keys.length <= 50 && keys.every((key) => !key.startsWith('$') && !key.includes('.')
            && !['__proto__', 'prototype', 'constructor'].includes(key) && visit(entry[key], depth + 1));
    };
    try { return visit(value) && JSON.stringify(value).length <= 2048; } catch { return false; }
};

const transferSchema = new mongoose.Schema({
    ticketId: { type: objectId, ref: 'Ticket', required: true, immutable: true },
    ticketNumber: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    systemId: { type: objectId, ref: 'System', required: true, immutable: true },
    sourceEnvironmentId: { type: objectId, ref: 'Environment', required: true, immutable: true },
    sourceSubEnvironmentId: { type: objectId, ref: 'SubEnvironment', required: true, immutable: true },
    sourceRoomId: { type: objectId, ref: 'Room', required: true, immutable: true },
    destinationEnvironmentId: { type: objectId, ref: 'Environment', required: true, immutable: true },
    destinationSubEnvironmentId: { type: objectId, ref: 'SubEnvironment', required: true, immutable: true },
    destinationRoomId: { type: objectId, ref: 'Room', required: true, immutable: true },
    status: { type: String, enum: TRANSFER_STATUS_VALUES, default: TRANSFER_STATUSES.PENDING_ACCEPTANCE, required: true },
    initiatedBy: { type: objectId, ref: 'User', required: true, immutable: true },
    initiatedAt: { type: Date, required: true, immutable: true },
    transferReason: { type: String, required: true, trim: true, minlength: 3, maxlength: 5000, immutable: true },
    acceptedBy: { type: objectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
    cancelledBy: { type: objectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, minlength: 3, maxlength: 5000, default: null },
    ticketVersionBeforeInitiation: { type: Number, required: true, min: 1, immutable: true },
    ticketVersionAfterInitiation: { type: Number, required: true, min: 2, immutable: true },
    ticketVersionBeforeResolution: { type: Number, min: 1, default: null },
    ticketVersionAfterResolution: { type: Number, min: 2, default: null },
    sequence: { type: Number, required: true, min: 1, immutable: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}), validate: { validator: safeMetadata, message: 'Transfer metadata must be a bounded safe object' } }
}, { collection: 'ticketTransfers', timestamps: true, strict: 'throw', versionKey: false });

transferSchema.pre('validate', function validateTransfer() {
    if (String(this.sourceRoomId) === String(this.destinationRoomId)) throw new Error('Transfer source and destination Rooms must differ');
    const accepted = Boolean(this.acceptedBy || this.acceptedAt);
    const cancelled = Boolean(this.cancelledBy || this.cancelledAt || this.cancellationReason);
    if (this.status === TRANSFER_STATUSES.PENDING_ACCEPTANCE && (accepted || cancelled)) throw new Error('Pending Transfer cannot contain resolution metadata');
    if (this.status === TRANSFER_STATUSES.ACCEPTED && (!this.acceptedBy || !this.acceptedAt || cancelled)) throw new Error('Accepted Transfer requires only acceptance metadata');
    if (this.status === TRANSFER_STATUSES.CANCELLED && (!this.cancelledBy || !this.cancelledAt || !this.cancellationReason || accepted)) throw new Error('Cancelled Transfer requires only cancellation metadata');
});

const immutableHistory = () => { throw new AppError({ statusCode: 405, code: 'TRANSFER_HISTORY_IMMUTABLE', message: 'Transfer history cannot be deleted' }); };
for (const hook of ['deleteOne', 'deleteMany', 'findOneAndDelete']) transferSchema.pre(hook, immutableHistory);

transferSchema.index({ ticketId: 1 }, { name: 'uniq_pending_transfer_per_ticket', unique: true, partialFilterExpression: { status: TRANSFER_STATUSES.PENDING_ACCEPTANCE } });
transferSchema.index({ ticketId: 1, sequence: 1 }, { name: 'uniq_transfer_sequence_per_ticket', unique: true });
transferSchema.index({ ticketId: 1, initiatedAt: 1, _id: 1 }, { name: 'transfer_ticket_history' });
transferSchema.index({ destinationRoomId: 1, status: 1, initiatedAt: -1 }, { name: 'transfer_incoming_room_queue' });
transferSchema.index({ sourceRoomId: 1, status: 1, initiatedAt: -1 }, { name: 'transfer_outgoing_room_queue' });
transferSchema.index({ destinationSubEnvironmentId: 1, status: 1, initiatedAt: -1 }, { name: 'transfer_incoming_sub_environment_queue' });
transferSchema.index({ sourceSubEnvironmentId: 1, status: 1, initiatedAt: -1 }, { name: 'transfer_outgoing_sub_environment_queue' });
transferSchema.index({ systemId: 1, status: 1, initiatedAt: -1 }, { name: 'transfer_system_history' });
transferSchema.index({ initiatedBy: 1, initiatedAt: -1 }, { name: 'transfer_initiator_history' });

const TicketTransfer = mongoose.models.TicketTransfer || mongoose.model('TicketTransfer', transferSchema);

module.exports = TicketTransfer;
