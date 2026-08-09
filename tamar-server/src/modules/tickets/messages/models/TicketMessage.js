const mongoose = require('mongoose');
const { CLIENT_MESSAGE_ID_PATTERN, MESSAGE_LIMITS } = require('../domain/message.constants.js');

const objectId = mongoose.Schema.Types.ObjectId;
const DISALLOWED_CONTROLS = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/u;
const validContent = (value) => typeof value === 'string' && value.length > 0
    && [...value].length <= MESSAGE_LIMITS.CONTENT_CHARACTERS
    && Buffer.byteLength(value, 'utf8') <= MESSAGE_LIMITS.CONTENT_BYTES
    && !DISALLOWED_CONTROLS.test(value);

const ticketMessageSchema = new mongoose.Schema({
    ticketId: { type: objectId, ref: 'Ticket', required: true, immutable: true },
    ticketNumber: { type: String, required: true, trim: true, immutable: true },
    systemId: { type: objectId, ref: 'System', required: true, immutable: true },
    authorUserId: { type: objectId, ref: 'User', required: true, immutable: true },
    clientMessageId: {
        type: String, required: true, immutable: true, match: CLIENT_MESSAGE_ID_PATTERN
    },
    content: { type: String, default: null },
    isEdited: { type: Boolean, required: true, default: false },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: objectId, ref: 'User', default: null },
    version: { type: Number, required: true, default: 1, min: 1 }
}, {
    collection: 'ticketmessages',
    timestamps: true,
    strict: 'throw',
    versionKey: false
});

ticketMessageSchema.pre('validate', function validateMessageState() {
    if (this.isDeleted) {
        if (this.content !== null || !this.deletedAt || !this.deletedBy
            || String(this.deletedBy) !== String(this.authorUserId)) {
            throw new Error('Deleted message requires a null tombstone owned by its author');
        }
    } else if (!validContent(this.content) || this.deletedAt || this.deletedBy) {
        throw new Error('Live message requires valid content and no deletion metadata');
    }
    if (this.isEdited !== Boolean(this.editedAt)) {
        throw new Error('Edited message metadata is inconsistent');
    }
});

ticketMessageSchema.index(
    { ticketId: 1, authorUserId: 1, clientMessageId: 1 },
    { name: 'uniq_ticket_author_client_message', unique: true }
);
ticketMessageSchema.index(
    { ticketId: 1, createdAt: 1, _id: 1 },
    { name: 'ticket_message_chronological_stream' }
);
ticketMessageSchema.index(
    { authorUserId: 1, createdAt: 1, _id: 1 },
    { name: 'ticket_message_author_activity' }
);
ticketMessageSchema.index(
    { ticketId: 1, isDeleted: 1, createdAt: 1, _id: 1 },
    { name: 'ticket_message_deletion_stream' }
);

const TicketMessage = mongoose.models.TicketMessage
    || mongoose.model('TicketMessage', ticketMessageSchema);

module.exports = TicketMessage;
