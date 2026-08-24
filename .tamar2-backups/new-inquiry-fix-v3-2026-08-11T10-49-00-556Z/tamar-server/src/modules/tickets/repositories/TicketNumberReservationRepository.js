const TicketNumberReservation = require('../models/TicketNumberReservation.js');

class TicketNumberReservationRepository {
    async findReusable(userId, roomId, { session } = {}) {
        return TicketNumberReservation.findOne({
            userId,
            roomId,
            consumedAt: null,
            expiresAt: { $gt: new Date() }
        })
            .sort({ createdAt: -1 })
            .session(session || null)
            .lean()
            .exec();
    }

    async create(payload, { session } = {}) {
        const [reservation] = await TicketNumberReservation.create([payload], { session });
        return reservation.toObject();
    }

    async consume(reservationId, userId, roomId, { session } = {}) {
        return TicketNumberReservation.findOneAndUpdate(
            {
                _id: reservationId,
                userId,
                roomId,
                consumedAt: null,
                expiresAt: { $gt: new Date() }
            },
            { $set: { consumedAt: new Date() } },
            { returnDocument: 'after', runValidators: true, session }
        )
            .lean()
            .exec();
    }
}

module.exports = TicketNumberReservationRepository;
