const mongoose = require('mongoose');

const ticketSequenceSchema = new mongoose.Schema({
    systemId: { type: mongoose.Schema.Types.ObjectId, ref: 'System', required: true, immutable: true },
    value: { type: Number, required: true, min: 0, default: 0 }
}, { collection: 'ticketSequences', timestamps: true, strict: 'throw', versionKey: false });

ticketSequenceSchema.index({ systemId: 1 }, { name: 'uniq_ticket_sequence_system', unique: true });
const TicketSequence = mongoose.models.TicketSequence || mongoose.model('TicketSequence', ticketSequenceSchema);

module.exports = TicketSequence;
