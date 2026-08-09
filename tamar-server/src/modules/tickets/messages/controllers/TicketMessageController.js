const setHeaders = (response, version) => {
    response.setHeader('Cache-Control', 'no-store');
    if (version) response.setHeader('ETag', `"${version}"`);
};

class TicketMessageController {
    constructor({ messageService, queryService }) {
        Object.assign(this, { messageService, queryService });
    }

    list = async (request, response) => {
        setHeaders(response);
        response.json({
            success: true,
            data: await this.queryService.list(request.user._id, request.ticketId, request.messageQuery)
        });
    };

    create = async (request, response) => {
        const data = await this.messageService.create(
            request.user._id, request.ticketId, request.messageInput
        );
        setHeaders(response, data.message.version);
        response.status(data.replayed ? 200 : 201).json({ success: true, data: {
            message: data.message, acknowledgement: data.acknowledgement
        } });
    };

    edit = async (request, response) => {
        const message = await this.messageService.edit(
            request.user._id, request.ticketId, request.messageId,
            request.expectedMessageVersion, request.messageInput.content
        );
        setHeaders(response, message.version);
        response.json({ success: true, data: { message } });
    };

    delete = async (request, response) => {
        const message = await this.messageService.delete(
            request.user._id, request.ticketId, request.messageId,
            request.expectedMessageVersion
        );
        setHeaders(response, message.version);
        response.json({ success: true, data: { message } });
    };
}

module.exports = TicketMessageController;
