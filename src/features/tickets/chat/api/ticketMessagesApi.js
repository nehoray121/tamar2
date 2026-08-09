import { authenticatedHttpClient } from '../../boards/api/authenticatedHttpClient.js';

const encode = (value) => encodeURIComponent(String(value));
const ticketPath = (ticketId) => `/api/tickets/${encode(ticketId)}`;
const messagesPath = (ticketId) => `${ticketPath(ticketId)}/messages`;

export const createTicketMessagesApi = (request = authenticatedHttpClient) => ({
    getTicketDetails({ ticketId, signal }) {
        return request(ticketPath(ticketId), { signal });
    },
    getTicketMessages({ ticketId, limit = 50, before, signal }) {
        const query = new URLSearchParams({ limit: String(limit) });
        if (before) query.set('before', before);
        return request(`${messagesPath(ticketId)}?${query.toString()}`, { signal });
    },
    createTicketMessage({ ticketId, clientMessageId, content, signal }) {
        return request(messagesPath(ticketId), {
            method: 'POST',
            body: { clientMessageId, content },
            signal
        });
    },
    updateTicketMessage({ ticketId, messageId, content, ifMatch, signal }) {
        return request(`${messagesPath(ticketId)}/${encode(messageId)}`, {
            method: 'PATCH',
            body: { content },
            headers: { 'If-Match': ifMatch },
            signal
        });
    },
    deleteTicketMessage({ ticketId, messageId, ifMatch, signal }) {
        return request(`${messagesPath(ticketId)}/${encode(messageId)}`, {
            method: 'DELETE',
            headers: { 'If-Match': ifMatch },
            signal
        });
    }
});

export const ticketMessagesApi = createTicketMessagesApi();
