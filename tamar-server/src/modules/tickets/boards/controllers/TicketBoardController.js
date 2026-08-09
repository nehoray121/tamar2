const setHeaders = (response, version) => {
    response.setHeader('Cache-Control', 'no-store');
    if (version !== undefined) response.setHeader('ETag', `"${version}"`);
};

class TicketBoardController {
    constructor({ categoryService, itemStateService, queryService }) {
        Object.assign(this, { categoryService, itemStateService, queryService });
    }

    listItems = async (request, response) => {
        setHeaders(response);
        const { roomId, boardType } = request.boardParams;
        const data = await this.queryService.list(request.user._id, roomId, boardType, request.boardQuery);
        response.json({ success: true, data });
    };

    listCategories = async (request, response) => {
        setHeaders(response);
        const { roomId, boardType } = request.boardParams;
        const data = await this.categoryService.list(request.user._id, roomId, boardType, request.categoryQuery);
        response.json({ success: true, data });
    };

    createCategory = async (request, response) => {
        const { roomId, boardType } = request.boardParams;
        const data = await this.categoryService.create(request.user._id, roomId, boardType, request.categoryInput);
        setHeaders(response, data.version);
        response.status(201).json({ success: true, data });
    };

    updateCategory = async (request, response) => {
        const { roomId, boardType } = request.boardParams;
        const data = await this.categoryService.update(request.user._id, roomId, boardType, request.categoryId, request.expectedCategoryVersion, request.categoryInput);
        setHeaders(response, data.version);
        response.json({ success: true, data });
    };

    archiveCategory = async (request, response) => {
        const { roomId, boardType } = request.boardParams;
        const data = await this.categoryService.archive(request.user._id, roomId, boardType, request.categoryId, request.expectedCategoryVersion);
        setHeaders(response, data.version);
        response.json({ success: true, data });
    };

    getState = async (request, response) => {
        const { roomId, boardType } = request.boardParams;
        const data = await this.itemStateService.get(request.user._id, roomId, boardType, request.itemId);
        setHeaders(response, data.version);
        response.json({ success: true, data });
    };

    updateState = async (request, response) => {
        const { roomId, boardType } = request.boardParams;
        const data = await this.itemStateService.mutate(request.user._id, roomId, boardType, request.itemId, request.expectedBoardStateVersion, request.boardStateInput);
        setHeaders(response, data.version);
        response.json({ success: true, data });
    };
}

module.exports = TicketBoardController;
