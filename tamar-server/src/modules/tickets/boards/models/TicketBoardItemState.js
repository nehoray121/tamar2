const mongoose = require('mongoose');
const {
    BOARD_ITEM_TYPES, BOARD_TYPE_VALUES, EXTERNAL_BOARD_TYPES, TICKET_BOARD_TYPES
} = require('../domain/board.constants.js');

const objectId = mongoose.Schema.Types.ObjectId;
const stateSchema = new mongoose.Schema({
    systemId: { type: objectId, ref: 'System', required: true, immutable: true },
    environmentId: { type: objectId, ref: 'Environment', required: true, immutable: true },
    subEnvironmentId: { type: objectId, ref: 'SubEnvironment', required: true, immutable: true },
    roomId: { type: objectId, ref: 'Room', required: true, immutable: true },
    boardType: { type: String, enum: BOARD_TYPE_VALUES, required: true, immutable: true },
    itemType: { type: String, enum: Object.values(BOARD_ITEM_TYPES), required: true, immutable: true },
    ticketId: { type: objectId, ref: 'Ticket', required: true, immutable: true },
    transferId: { type: objectId, ref: 'TicketTransfer', default: null, immutable: true },
    categoryId: { type: objectId, ref: 'TicketBoardCategory', default: null },
    categoryChangedAt: { type: Date, default: null },
    categoryChangedBy: { type: objectId, ref: 'User', default: null },
    isPinned: { type: Boolean, default: false, required: true },
    pinnedAt: { type: Date, default: null },
    pinnedBy: { type: objectId, ref: 'User', default: null },
    version: { type: Number, min: 1, default: 1, required: true }
}, { collection: 'ticketBoardItemStates', timestamps: true, strict: 'throw', versionKey: false });

stateSchema.pre('validate', function validateBoardIdentity() {
    if (TICKET_BOARD_TYPES.includes(this.boardType)) {
        if (this.itemType !== BOARD_ITEM_TYPES.TICKET || this.transferId) throw new Error('Ticket board state identity is invalid');
    } else if (EXTERNAL_BOARD_TYPES.includes(this.boardType)) {
        if (this.itemType !== BOARD_ITEM_TYPES.TRANSFER || !this.transferId) throw new Error('Transfer board state identity is invalid');
    }
    if (this.categoryId && (!this.categoryChangedAt || !this.categoryChangedBy)) throw new Error('Category assignment metadata is required');
    if (!this.categoryId && (this.categoryChangedAt || this.categoryChangedBy)) throw new Error('Uncategorized state cannot retain assignment metadata');
    if (this.isPinned && (!this.pinnedAt || !this.pinnedBy)) throw new Error('Pinned state requires pin metadata');
    if (!this.isPinned && (this.pinnedAt || this.pinnedBy)) throw new Error('Unpinned state cannot retain pin metadata');
});

// One shared Ticket state per Room and Ticket-board type.
stateSchema.index(
    { roomId: 1, boardType: 1, ticketId: 1 },
    { name: 'uniq_ticket_board_state', unique: true, partialFilterExpression: { itemType: BOARD_ITEM_TYPES.TICKET } }
);
// One shared Transfer state per Room, external-board type and Transfer.
stateSchema.index(
    { roomId: 1, boardType: 1, transferId: 1 },
    { name: 'uniq_transfer_board_state', unique: true, partialFilterExpression: { itemType: BOARD_ITEM_TYPES.TRANSFER } }
);
// Supports pinned-first ordering without loading the Board into memory.
stateSchema.index({ roomId: 1, boardType: 1, isPinned: 1, pinnedAt: -1 }, { name: 'board_state_pin_order' });
// Supports category filtering and recent metadata lookups.
stateSchema.index({ roomId: 1, boardType: 1, categoryId: 1, updatedAt: -1 }, { name: 'board_state_category_filter' });
// Supports Ticket-state lookup across Room-board contexts.
stateSchema.index({ ticketId: 1, roomId: 1, boardType: 1 }, { name: 'board_state_ticket_lookup' });
// Supports Transfer-state lookup across sent/received contexts.
stateSchema.index({ transferId: 1, roomId: 1, boardType: 1 }, { name: 'board_state_transfer_lookup' });

const TicketBoardItemState = mongoose.models.TicketBoardItemState
    || mongoose.model('TicketBoardItemState', stateSchema);

module.exports = TicketBoardItemState;
