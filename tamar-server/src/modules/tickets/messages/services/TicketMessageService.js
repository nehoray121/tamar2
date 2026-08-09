const { MESSAGE_EVENTS } = require('../domain/message.constants.js');
const { toMessageDto } = require('../domain/message.dto.js');
const { messageError, messageNotFound } = require('../domain/message.errors.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class TicketMessageService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async context(userId, ticketId) {
        const ticket = await this.ticketRepository.findById(ticketId);
        await this.authorizationService.requireChatAccess(userId, ticket);
        return ticket;
    }

    async dto(userId, message) {
        const summaries = await this.userSummaryService.mapByIds([message.authorUserId]);
        return toMessageDto(message, {
            author: summaries.get(String(message.authorUserId)),
            capabilities: this.capabilityService.forMessage(userId, message, true)
        });
    }

    idempotencyResult(existing, content) {
        if (existing.content !== content || existing.isDeleted) {
            throw messageError(409, 'MESSAGE_IDEMPOTENCY_CONFLICT', 'clientMessageId is already used by different content');
        }
        return existing;
    }

    async create(userId, ticketId, input) {
        const ticket = await this.context(userId, ticketId);
        let message = await this.messageRepository.findByIdempotency(
            ticketId, userId, input.clientMessageId
        );
        let replayed = Boolean(message);
        if (message) message = this.idempotencyResult(message, input.content);
        else {
            try {
                message = await this.messageRepository.create({
                    ticketId: ticket._id,
                    ticketNumber: ticket.ticketNumber,
                    systemId: ticket.systemId,
                    authorUserId: userId,
                    clientMessageId: input.clientMessageId,
                    content: input.content,
                    version: 1
                });
            } catch (error) {
                if (error?.code !== 11000) throw error;
                message = await this.messageRepository.findByIdempotency(
                    ticketId, userId, input.clientMessageId
                );
                if (!message) throw error;
                message = this.idempotencyResult(message, input.content);
                replayed = true;
            }
        }
        if (!replayed) await this.realtimePublisher.publish(MESSAGE_EVENTS.CREATED, message, ticket);
        return {
            message: await this.dto(userId, message),
            acknowledgement: {
                clientMessageId: input.clientMessageId,
                messageId: String(message._id),
                persistedAt: message.createdAt,
                replayed
            },
            replayed
        };
    }

    assertOwnLiveMessage(userId, message, operation) {
        if (!message) throw messageNotFound();
        if (!sameId(userId, message.authorUserId)) {
            throw messageError(403, 'MESSAGE_NOT_AUTHORED_BY_ACTOR', `Only the author may ${operation} this message`);
        }
        if (message.isDeleted) {
            const code = operation === 'edit' ? 'MESSAGE_CANNOT_EDIT_DELETED' : 'MESSAGE_ALREADY_DELETED';
            throw messageError(409, code, 'Deleted message cannot be changed');
        }
    }

    async classifyAtomicMiss(userId, ticketId, messageId, expectedVersion, operation) {
        const current = await this.messageRepository.findByTicketAndId(ticketId, messageId);
        this.assertOwnLiveMessage(userId, current, operation);
        if (current.version !== expectedVersion) {
            throw messageError(409, 'MESSAGE_VERSION_CONFLICT', 'Message version is stale');
        }
        throw messageError(409, 'MESSAGE_VERSION_CONFLICT', 'Message changed concurrently');
    }

    async edit(userId, ticketId, messageId, expectedVersion, content) {
        const ticket = await this.context(userId, ticketId);
        const current = await this.messageRepository.findByTicketAndId(ticketId, messageId);
        this.assertOwnLiveMessage(userId, current, 'edit');
        if (current.version !== expectedVersion) {
            throw messageError(409, 'MESSAGE_VERSION_CONFLICT', 'Message version is stale');
        }
        if (current.content === content) {
            throw messageError(400, 'EMPTY_MESSAGE_UPDATE', 'Message content must change');
        }
        const updated = await this.messageRepository.editOwn(
            ticketId, messageId, userId, expectedVersion, content, new Date()
        );
        if (!updated) await this.classifyAtomicMiss(userId, ticketId, messageId, expectedVersion, 'edit');
        await this.realtimePublisher.publish(MESSAGE_EVENTS.UPDATED, updated, ticket);
        return this.dto(userId, updated);
    }

    async delete(userId, ticketId, messageId, expectedVersion) {
        const ticket = await this.context(userId, ticketId);
        const current = await this.messageRepository.findByTicketAndId(ticketId, messageId);
        this.assertOwnLiveMessage(userId, current, 'delete');
        if (current.version !== expectedVersion) {
            throw messageError(409, 'MESSAGE_VERSION_CONFLICT', 'Message version is stale');
        }
        const deleted = await this.messageRepository.softDeleteOwn(
            ticketId, messageId, userId, expectedVersion, new Date()
        );
        if (!deleted) await this.classifyAtomicMiss(userId, ticketId, messageId, expectedVersion, 'delete');
        await this.realtimePublisher.publish(MESSAGE_EVENTS.DELETED, deleted, ticket);
        return this.dto(userId, deleted);
    }
}

module.exports = TicketMessageService;
