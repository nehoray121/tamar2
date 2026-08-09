const mongoose = require('mongoose');
const AppError = require('../../../errors/AppError.js');
const { TICKET_HISTORY_EVENT_VALUES } = require('../domain/constants.js');

const objectId = mongoose.Schema.Types.ObjectId;
const ticketHistorySchema = new mongoose.Schema({
    ticketId: { type: objectId, ref: 'Ticket', required: true, immutable: true },
    ticketNumber: { type: String, required: true, immutable: true },
    systemId: { type: objectId, required: true, immutable: true },
    environmentId: { type: objectId, required: true, immutable: true },
    subEnvironmentId: { type: objectId, required: true, immutable: true },
    roomId: { type: objectId, required: true, immutable: true },
    eventType: { type: String, enum: TICKET_HISTORY_EVENT_VALUES, required: true, immutable: true },
    actorUserId: { type: objectId, ref: 'User', required: true, immutable: true },
    actorRoleContext: { type: String, required: true, maxlength: 64, immutable: true },
    versionBefore: { type: Number, required: true, min: 0, immutable: true },
    versionAfter: { type: Number, required: true, min: 1, immutable: true },
    changedFields: { type: [String], default: [], immutable: true },
    changes: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true }
}, { collection: 'ticketHistory', timestamps: { createdAt: true, updatedAt: false }, strict: 'throw', versionKey: false });

const immutableError = () => { throw new AppError({ statusCode: 405, code: 'TICKET_HISTORY_IMMUTABLE', message: 'Ticket history is append-only' }); };
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
    ticketHistorySchema.pre(hook, immutableError);
}

ticketHistorySchema.index({ ticketId: 1, createdAt: 1 }, { name: 'ticket_history_chronology' });
ticketHistorySchema.index({ ticketId: 1, versionAfter: 1 }, { name: 'ticket_history_version' });
ticketHistorySchema.index({ actorUserId: 1, createdAt: -1 }, { name: 'ticket_history_actor' });
ticketHistorySchema.index({ eventType: 1, createdAt: -1 }, { name: 'ticket_history_event' });

const TicketHistory = mongoose.models.TicketHistory || mongoose.model('TicketHistory', ticketHistorySchema);

module.exports = TicketHistory;
