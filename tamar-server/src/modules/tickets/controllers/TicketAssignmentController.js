const setTicketHeaders = (response, version) => {
    response.setHeader('Cache-Control', 'no-store');
    if (version) response.setHeader('ETag', `"${version}"`);
};

class TicketAssignmentController {
    constructor({ assignmentService }) { this.assignmentService = assignmentService; }

    replace = async (request, response) => {
        const data = await this.assignmentService.replace(
            request.user._id, request.ticketId, request.expectedTicketVersion, request.assignmentInput.assigneeIds
        );
        setTicketHeaders(response, data.version);
        response.json({ success: true, data });
    };

    assignableUsers = async (request, response) => {
        setTicketHeaders(response);
        response.json({ success: true, data: await this.assignmentService.assignableUsers(
            request.user._id, request.ticketId, request.assignmentQuery
        ) });
    };

    assignments = async (request, response) => {
        setTicketHeaders(response);
        response.json({ success: true, data: await this.assignmentService.assignments(
            request.user._id, request.ticketId, request.assignmentQuery
        ) });
    };

    bulk = async (request, response) => {
        setTicketHeaders(response);
        response.json({ success: true, data: await this.assignmentService.bulk(request.user._id, request.assignmentInput) });
    };
}

module.exports = TicketAssignmentController;
