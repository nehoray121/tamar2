const setHeaders = (response, version) => {
    response.setHeader('Cache-Control', 'no-store');
    if (version) response.setHeader('ETag', `"${version}"`);
};

class TicketTransferController {
    constructor({ transferService, queryService, targetService }) {
        Object.assign(this, { transferService, queryService, targetService });
    }

    initiate = async (request, response) => {
        const data = await this.transferService.initiate(
            request.user._id, request.ticketId, request.expectedTicketVersion, request.transferInput
        );
        setHeaders(response, data.ticket.version);
        response.status(201).json({ success: true, data });
    };

    accept = async (request, response) => {
        const data = await this.transferService.accept(
            request.user._id, request.transferId, request.expectedTicketVersion
        );
        setHeaders(response, data.ticket.version);
        response.json({ success: true, data });
    };

    cancel = async (request, response) => {
        const data = await this.transferService.cancel(
            request.user._id, request.transferId, request.expectedTicketVersion, request.transferInput.reason
        );
        setHeaders(response, data.ticket.version);
        response.json({ success: true, data });
    };

    list = async (request, response) => {
        setHeaders(response);
        response.json({ success: true, data: await this.queryService.list(request.user._id, request.transferQuery) });
    };

    detail = async (request, response) => {
        setHeaders(response);
        response.json({ success: true, data: await this.queryService.detail(request.user._id, request.transferId) });
    };

    history = async (request, response) => {
        setHeaders(response);
        response.json({ success: true, data: await this.queryService.ticketHistory(
            request.user._id, request.ticketId, request.transferQuery
        ) });
    };

    targets = async (request, response) => {
        setHeaders(response);
        response.json({ success: true, data: await this.targetService.list(
            request.user._id, request.ticketId, request.transferQuery
        ) });
    };
}

module.exports = TicketTransferController;
