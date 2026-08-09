const id = (value) => value ? String(value) : null;

const unavailableAuthor = (authorUserId) => ({
    id: id(authorUserId), displayName: 'Unavailable user', email: null
});

const toMessageDto = (message, { author, capabilities } = {}) => ({
    id: id(message._id),
    ticketId: id(message.ticketId),
    author: author || unavailableAuthor(message.authorUserId),
    content: message.isDeleted ? null : message.content,
    isEdited: Boolean(message.isEdited),
    editedAt: message.editedAt || null,
    isDeleted: Boolean(message.isDeleted),
    deletedAt: message.deletedAt || null,
    version: message.version,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    capabilities: capabilities || { canEdit: false, canDelete: false }
});

module.exports = { toMessageDto };
