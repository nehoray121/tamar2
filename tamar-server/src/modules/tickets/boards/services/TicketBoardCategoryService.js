const { toCategoryDto } = require('../domain/board.dto.js');
const {
    boardError,
    categoryNotFound
} = require('../domain/board.errors.js');
const {
    normalizeCategoryName
} = require('../domain/board.validators.js');

const escapedRegex = (value) => value.replace(
    /[.*+?^${}()|[\]\\]/gu,
    '\\$&'
);
const pagination = (page, limit, totalItems) => ({
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    hasNextPage: page * limit < totalItems,
    hasPreviousPage: page > 1
});
const equalValue = (left, right) => (left ?? null) === (right ?? null);

const categoryInput = (input, { requireName = false } = {}) => {
    const output = {};
    if (Object.hasOwn(input, 'name')) {
        Object.assign(output, normalizeCategoryName(input.name));
    } else if (requireName) {
        throw boardError(
            400,
            'INVALID_CATEGORY_NAME',
            'Category name is required'
        );
    }

    if (Object.hasOwn(input, 'description')) {
        output.description = input.description;
    }
    if (Object.hasOwn(input, 'color')) output.color = input.color;
    return output;
};

class TicketBoardCategoryService {
    constructor(dependencies) {
        Object.assign(this, dependencies);
    }

    async context(actorId, roomId, boardType, { manage = false } = {}) {
        return manage
            ? this.authorizationService.assertCanManage(
                actorId,
                roomId,
                boardType
            )
            : this.authorizationService.authorize(
                actorId,
                roomId,
                boardType
            );
    }

    async list(actorId, roomId, boardType, query) {
        await this.context(actorId, roomId, boardType);
        const filter = { roomId, boardType };
        if (!query.includeArchived) filter.isActive = true;
        if (query.search) {
            const search = new RegExp(escapedRegex(query.search), 'iu');
            filter.$or = [{ name: search }, { description: search }];
        }

        const direction = query.sortDirection === 'desc' ? -1 : 1;
        const result = await this.categoryRepository.list(filter, {
            page: query.page,
            limit: query.limit,
            sort: {
                [query.sortBy]: direction,
                _id: direction
            }
        });

        return {
            items: result.items.map(toCategoryDto),
            pagination: pagination(
                query.page,
                query.limit,
                result.totalItems
            ),
            sort: {
                sortBy: query.sortBy,
                sortDirection: query.sortDirection
            }
        };
    }

    async create(actorId, roomId, boardType, input) {
        const { lineage } = await this.context(
            actorId,
            roomId,
            boardType,
            { manage: true }
        );
        const values = categoryInput(input, { requireName: true });
        const category = await this.categoryRepository.create({
            systemId: lineage.system._id,
            environmentId: lineage.environment._id,
            subEnvironmentId: lineage.subEnvironment._id,
            roomId: lineage.room._id,
            boardType,
            ...values,
            description: values.description ?? null,
            color: values.color ?? null,
            isActive: true,
            createdBy: actorId,
            updatedBy: actorId,
            version: 1
        });

        this.realtimePublisher.publishCategory(
            'board:category-created',
            category
        );
        return toCategoryDto(category);
    }

    async update(
        actorId,
        roomId,
        boardType,
        categoryId,
        expectedVersion,
        input
    ) {
        await this.context(actorId, roomId, boardType, { manage: true });
        const values = categoryInput(input);
        const current = await this.categoryRepository.findScoped(
            categoryId,
            roomId,
            boardType
        );
        if (!current || !current.isActive) throw categoryNotFound();
        if (current.version !== expectedVersion) {
            throw boardError(
                409,
                'BOARD_CATEGORY_VERSION_CONFLICT',
                'Board category version is stale'
            );
        }

        const changed = Object.entries(values).some(([key, value]) => (
            !equalValue(current[key], value)
        ));
        if (!changed) {
            throw boardError(
                400,
                'EMPTY_CATEGORY_UPDATE',
                'Category update must contain an effective change'
            );
        }

        const category = await this.categoryRepository.updateActive(
            categoryId,
            roomId,
            boardType,
            expectedVersion,
            { ...values, updatedBy: actorId }
        );
        if (!category) {
            throw boardError(
                409,
                'BOARD_CATEGORY_VERSION_CONFLICT',
                'Board category version is stale'
            );
        }

        this.realtimePublisher.publishCategory(
            'board:category-updated',
            category
        );
        return toCategoryDto(category);
    }

    async archive(
        actorId,
        roomId,
        boardType,
        categoryId,
        expectedVersion
    ) {
        await this.context(actorId, roomId, boardType, { manage: true });
        const current = await this.categoryRepository.findScoped(
            categoryId,
            roomId,
            boardType
        );
        if (!current || !current.isActive) throw categoryNotFound();
        if (current.version !== expectedVersion) {
            throw boardError(
                409,
                'BOARD_CATEGORY_VERSION_CONFLICT',
                'Board category version is stale'
            );
        }

        const category = await this.categoryRepository.archiveActive(
            categoryId,
            roomId,
            boardType,
            expectedVersion,
            actorId,
            new Date()
        );
        if (!category) {
            throw boardError(
                409,
                'BOARD_CATEGORY_VERSION_CONFLICT',
                'Board category version is stale'
            );
        }

        this.realtimePublisher.publishCategory(
            'board:category-archived',
            category
        );
        return toCategoryDto(category);
    }
}

module.exports = TicketBoardCategoryService;
