const mongoose = require('mongoose');

const objectId = mongoose.Schema.Types.ObjectId;

const ticketNumberReservationSchema = new mongoose.Schema({
    userId: { type: objectId, ref: 'User', required: true, immutable: true },
    systemId: { type: objectId, ref: 'System', required: true, immutable: true },
    roomId: { type: objectId, ref: 'Room', required: true, immutable: true },
    sequenceNumber: { type: Number, required: true, min: 1, immutable: true },
    ticketNumber: { type: String, required: true, trim: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true },
    consumedAt: { type: Date, default: null }
}, {
    collection: 'ticketNumberReservations',
    timestamps: true,
    strict: 'throw',
    versionKey: false
});

ticketNumberReservationSchema.index(
    { userId: 1, roomId: 1, consumedAt: 1, expiresAt: -1 },
    { name: 'ticket_number_reservation_reuse' }
);
ticketNumberReservationSchema.index(
    { systemId: 1, sequenceNumber: 1 },
    { name: 'ticket_number_reservation_sequence' }
);
ticketNumberReservationSchema.index(
    { expiresAt: 1 },
    { name: 'ticket_number_reservation_expiry', expireAfterSeconds: 0 }
);

const TicketNumberReservation = mongoose.models.TicketNumberReservation
    || mongoose.model('TicketNumberReservation', ticketNumberReservationSchema);

module.exports = TicketNumberReservation;
