const mongoose = require('mongoose');
const { BOARD_TYPE_VALUES } = require('../domain/board.constants.js');
const { normalizeCategoryName } = require('../domain/board.validators.js');

const objectId = mongoose.Schema.Types.ObjectId;
const categorySchema = new mongoose.Schema({
    systemId: { type: objectId, ref: 'System', required: true, immutable: true },
    environmentId: { type: objectId, ref: 'Environment', required: true, immutable: true },
    subEnvironmentId: { type: objectId, ref: 'SubEnvironment', required: true, immutable: true },
    roomId: { type: objectId, ref: 'Room', required: true, immutable: true },
    boardType: { type: String, enum: BOARD_TYPE_VALUES, required: true, immutable: true },
    name: { type: String, required: true },
    normalizedName: { type: String, required: true, immutable: false },
    description: { type: String, maxlength: 500, default: null },
    color: { type: String, match: /^#[0-9A-F]{6}$/u, default: null },
    isActive: { type: Boolean, default: true, required: true },
    createdBy: { type: objectId, ref: 'User', required: true, immutable: true },
    updatedBy: { type: objectId, ref: 'User', required: true },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: objectId, ref: 'User', default: null },
    version: { type: Number, min: 1, default: 1, required: true }
}, { collection: 'ticketBoardCategories', timestamps: true, strict: 'throw', versionKey: false });

categorySchema.pre('validate', function validateCategory() {
    const normalized = normalizeCategoryName(this.name);
    this.name = normalized.name;
    this.normalizedName = normalized.normalizedName;
    if (this.isActive && (this.archivedAt || this.archivedBy)) throw new Error('Active category cannot contain archive metadata');
    if (!this.isActive && (!this.archivedAt || !this.archivedBy)) throw new Error('Archived category requires archive metadata');
});

// Prevents duplicate active names in one Room board while allowing archived-name reuse.
categorySchema.index(
    { roomId: 1, boardType: 1, normalizedName: 1 },
    { name: 'uniq_active_board_category_name', unique: true, partialFilterExpression: { isActive: true } }
);
// Supports paginated category browsing and lifecycle filtering in one Room board.
categorySchema.index(
    { roomId: 1, boardType: 1, isActive: 1, normalizedName: 1, _id: 1 },
    { name: 'board_category_listing' }
);

const TicketBoardCategory = mongoose.models.TicketBoardCategory
    || mongoose.model('TicketBoardCategory', categorySchema);

module.exports = TicketBoardCategory;
