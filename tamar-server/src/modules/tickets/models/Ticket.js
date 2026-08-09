const mongoose = require('mongoose');
const { TICKET_PRIORITIES, TICKET_PRIORITY_VALUES, TICKET_STATUSES, TICKET_STATUS_VALUES } = require('../domain/constants.js');
const { isValidFieldValues } = require('../domain/fieldValues.js');

const objectId = mongoose.Schema.Types.ObjectId;
const ticketSchema = new mongoose.Schema({
    systemId: { type: objectId, ref: 'System', required: true, immutable: true },
    environmentId: { type: objectId, ref: 'Environment', required: true },
    subEnvironmentId: { type: objectId, ref: 'SubEnvironment', required: true },
    originalRoomId: { type: objectId, ref: 'Room', required: true, immutable: true },
    currentRoomId: { type: objectId, ref: 'Room', required: true },
    visibleRoomIds: { type: [objectId], required: true },
    sequenceNumber: { type: Number, required: true, min: 1, immutable: true },
    ticketNumber: { type: String, required: true, trim: true, immutable: true },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 1, maxlength: 20000 },
    priority: { type: String, enum: TICKET_PRIORITY_VALUES, default: TICKET_PRIORITIES.MEDIUM, required: true },
    fieldValues: { type: mongoose.Schema.Types.Mixed, default: () => ({}), validate: { validator: isValidFieldValues, message: 'Invalid fieldValues' } },
    status: { type: String, enum: TICKET_STATUS_VALUES, default: TICKET_STATUSES.OPEN, required: true },
    createdBy: { type: objectId, ref: 'User', required: true, immutable: true },
    activeAssigneeIds: { type: [objectId], ref: 'User', default: [] },
    closedBy: { type: objectId, ref: 'User', default: null },
    closedAt: { type: Date, default: null },
    closureSummary: { type: String, trim: true, minlength: 3, maxlength: 5000, default: null },
    activeTransferId: { type: objectId, ref: 'TicketTransfer', default: null },
    version: { type: Number, required: true, min: 1, default: 1 }
}, {
    collection: 'tickets', timestamps: true, strict: 'throw', versionKey: false
});

ticketSchema.pre('validate', function validateTicketState() {
    const visible = [...new Set(this.visibleRoomIds.map(String))];
    if (!visible.includes(String(this.currentRoomId)) || !visible.includes(String(this.originalRoomId))
        || visible.length !== this.visibleRoomIds.length) {
        throw new Error('visibleRoomIds must uniquely contain originalRoomId and currentRoomId');
    }
    const isClosed = this.status === TICKET_STATUSES.CLOSED;
    if (isClosed && (!this.closedBy || !this.closedAt || !this.closureSummary)) throw new Error('Closed ticket requires closure metadata');
    if (!isClosed && (this.closedBy || this.closedAt || this.closureSummary)) throw new Error('Open ticket cannot contain closure metadata');
});

ticketSchema.index({ ticketNumber: 1 }, { name: 'uniq_ticket_number', unique: true });
ticketSchema.index({ systemId: 1, sequenceNumber: 1 }, { name: 'uniq_ticket_sequence_per_system', unique: true });
ticketSchema.index({ currentRoomId: 1, status: 1, updatedAt: -1 }, { name: 'ticket_current_room_status_updated' });
ticketSchema.index({ visibleRoomIds: 1, status: 1, updatedAt: -1 }, { name: 'ticket_visible_room_status_updated' });
ticketSchema.index({ createdBy: 1, status: 1, updatedAt: -1 }, { name: 'ticket_creator_status_updated' });
ticketSchema.index({ activeAssigneeIds: 1, status: 1, updatedAt: -1 }, { name: 'ticket_assignee_status_updated' });
ticketSchema.index({ systemId: 1, status: 1, createdAt: -1 }, { name: 'ticket_system_status_created' });
ticketSchema.index({ environmentId: 1, status: 1, updatedAt: -1 }, { name: 'ticket_environment_status_updated' });
ticketSchema.index({ subEnvironmentId: 1, status: 1, updatedAt: -1 }, { name: 'ticket_sub_environment_status_updated' });
ticketSchema.index({ status: 1, closedAt: -1 }, { name: 'ticket_status_closed' });

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
