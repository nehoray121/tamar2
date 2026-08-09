const { toStateDto } = require('../domain/board.dto.js');
const { boardError, categoryNotFound } = require('../domain/board.errors.js');

const sameId = (left, right) => String(left ?? '') === String(right ?? '');

class TicketBoardItemStateService {
    constructor(dependencies) { Object.assign(this, dependencies); }

    async resolveContext(actorId, roomId, boardType, itemId) {
        const { lineage } = await this.authorizationService.authorize(actorId, roomId, boardType);
        const resolved = await this.eligibilityService.resolve(roomId, boardType, itemId);
        return { lineage, resolved, identity: this.eligibilityService.identity(lineage, boardType, resolved) };
    }

    async categoryForState(state) {
        return state?.categoryId ? this.categoryRepository.findScoped(
            state.categoryId, state.roomId, state.boardType
        ) : null;
    }

    capabilities() { return this.capabilityService.forAuthorizedItem(true); }

    async get(actorId, roomId, boardType, itemId) {
        const { identity } = await this.resolveContext(actorId, roomId, boardType, itemId);
        const state = await this.stateRepository.findByIdentity(identity);
        const category = await this.categoryForState(state);
        return toStateDto(state, { category, capabilities: this.capabilities() });
    }

    async validateNewCategory(categoryId, roomId, boardType) {
        if (categoryId === null) return null;
        const category = await this.categoryRepository.findScoped(categoryId, roomId, boardType);
        if (!category) throw categoryNotFound();
        if (!category.isActive) throw boardError(409, 'BOARD_CATEGORY_ARCHIVED', 'Archived category cannot be assigned');
        return category;
    }

    buildMutation(current, input, actorId, now) {
        const mutation = {};
        if (Object.hasOwn(input, 'categoryId')) {
            mutation.categoryId = input.categoryId;
            mutation.categoryChangedAt = input.categoryId ? now : null;
            mutation.categoryChangedBy = input.categoryId ? actorId : null;
        }
        if (Object.hasOwn(input, 'isPinned')) {
            mutation.isPinned = input.isPinned;
            mutation.pinnedAt = input.isPinned ? now : null;
            mutation.pinnedBy = input.isPinned ? actorId : null;
        }
        const categoryChanged = Object.hasOwn(input, 'categoryId')
            && !sameId(current?.categoryId, input.categoryId);
        const pinChanged = Object.hasOwn(input, 'isPinned')
            && Boolean(current?.isPinned) !== input.isPinned;
        if (!categoryChanged && !pinChanged) {
            throw boardError(400, 'EMPTY_BOARD_STATE_UPDATE', 'Board state update must contain an effective change');
        }
        return mutation;
    }

    async mutate(actorId, roomId, boardType, itemId, expectedVersion, input) {
        const context = await this.resolveContext(actorId, roomId, boardType, itemId);
        if (Object.hasOwn(input, 'categoryId')) await this.validateNewCategory(input.categoryId, roomId, boardType);
        const current = await this.stateRepository.findByIdentity(context.identity);
        const actualVersion = current?.version || 0;
        if (actualVersion !== expectedVersion) {
            throw boardError(409, 'BOARD_STATE_VERSION_CONFLICT', 'Board state version is stale');
        }
        const mutation = this.buildMutation(current, input, actorId, new Date());
        let state;
        try {
            state = expectedVersion === 0
                ? await this.stateRepository.createVersionOne(context.identity, mutation)
                : await this.stateRepository.updateVersioned(context.identity, expectedVersion, mutation);
        } catch (error) {
            if (error?.code === 11000) {
                throw boardError(409, 'BOARD_STATE_VERSION_CONFLICT', 'Board state version is stale');
            }
            throw error;
        }
        if (!state) throw boardError(409, 'BOARD_STATE_VERSION_CONFLICT', 'Board state version is stale');
        const category = await this.categoryForState(state);
        this.realtimePublisher.publishState(state);
        return toStateDto(state, { category, capabilities: this.capabilities() });
    }
}

module.exports = TicketBoardItemStateService;
