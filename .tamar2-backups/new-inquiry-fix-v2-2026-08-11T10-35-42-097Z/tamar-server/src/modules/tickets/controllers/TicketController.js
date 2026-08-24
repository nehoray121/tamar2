const setTicketHeaders = (response, version) => {
    response.setHeader('Cache-Control', 'no-store');
    if (version) response.setHeader('ETag', `"${version}"`);
};
class TicketController {
    constructor({ ticketService }) { this.ticketService = ticketService; }
    create = async (request, response) => {
        const data = await this.ticketService.create(request.user._id, request.ticketInput);
        setTicketHeaders(response, data.version);
        response.status(201).json({ success: true, data });
    };
    list = async (request, response) => {
        setTicketHeaders(response);
        response.json({ success: true, data: await this.ticketService.list(request.user._id, request.ticketQuery) });
    };
    get = async (request, response) => {
        const data = await this.ticketService.get(request.user._id, request.ticketId);
        setTicketHeaders(response, data.version);
        response.json({ success: true, data });
    };
    update = async (request, response) => {
        const data = await this.ticketService.update(request.user._id, request.ticketId, request.expectedTicketVersion, request.ticketInput);
        setTicketHeaders(response, data.version);
        response.json({ success: true, data });
    };
    close = async (request, response) => {
        const data = await this.ticketService.close(request.user._id, request.ticketId, request.expectedTicketVersion, request.ticketInput.closureSummary);
        setTicketHeaders(response, data.version);
        response.json({ success: true, data });
    };
    history = async (request, response) => {
        setTicketHeaders(response);
        response.json({ success: true, data: await this.ticketService.history(request.user._id, request.ticketId, request.ticketQuery) });
    };
}

module.exports = TicketController;
