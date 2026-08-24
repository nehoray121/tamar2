import {
    authenticatedHttpClient
} from '../boards/api/authenticatedHttpClient.js';

const encode = encodeURIComponent;
const withQuery = (path, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (
            value !== undefined
            && value !== null
            && value !== ''
            && !['pinMode', 'categoryMode', 'categoryId'].includes(key)
        ) {
            query.set(key, String(value));
        }
    });
    return query.size ? `${path}?${query}` : path;
};

const versionHeader = (version) => ({
    'If-Match': `"${Number(version)}"`
});

export const createTicketsApi = (
    request = authenticatedHttpClient
) => ({
    reserveNumber(roomId, options = {}) {
        return request('/api/tickets/number-reservations', {
            method: 'POST',
            body: { roomId },
            signal: options.signal
        });
    },
    create(input, options = {}) {
        return request('/api/tickets', {
            method: 'POST',
            body: input,
            signal: options.signal
        });
    },

    list(params, options = {}) {
        return request(withQuery('/api/tickets', params), {
            signal: options.signal
        });
    },

    get(ticketId, options = {}) {
        return request(`/api/tickets/${encode(ticketId)}`, {
            signal: options.signal
        });
    },

    update(ticketId, input, version, options = {}) {
        return request(`/api/tickets/${encode(ticketId)}`, {
            method: 'PATCH',
            headers: versionHeader(version),
            body: input,
            signal: options.signal
        });
    },

    history(ticketId, params = {}, options = {}) {
        return request(
            withQuery(
                `/api/tickets/${encode(ticketId)}/history`,
                params
            ),
            { signal: options.signal }
        );
    },

    getTransferTargets(ticketId, params = {}, options = {}) {
        return request(
            withQuery(
                `/api/tickets/${encode(ticketId)}/transfer-targets`,
                params
            ),
            { signal: options.signal }
        );
    },

    initiateTransfer(ticketId, input, version, options = {}) {
        return request(
            `/api/tickets/${encode(ticketId)}/transfers`,
            {
                method: 'POST',
                headers: versionHeader(version),
                body: input,
                signal: options.signal
            }
        );
    },

    acceptTransfer(transferId, ticketVersion, options = {}) {
        return request(
            `/api/ticket-transfers/${encode(transferId)}/accept`,
            {
                method: 'POST',
                headers: versionHeader(ticketVersion),
                body: {},
                signal: options.signal
            }
        );
    },

    cancelTransfer(
        transferId,
        ticketVersion,
        reason,
        options = {}
    ) {
        return request(
            `/api/ticket-transfers/${encode(transferId)}/cancel`,
            {
                method: 'POST',
                headers: versionHeader(ticketVersion),
                body: { reason },
                signal: options.signal
            }
        );
    },

    getAssignableUsers(ticketId, params = {}, options = {}) {
        return request(
            withQuery(
                `/api/tickets/${encode(ticketId)}/assignable-users`,
                params
            ),
            { signal: options.signal }
        );
    },

    replaceAssignees(
        ticketId,
        assigneeIds,
        version,
        options = {}
    ) {
        return request(
            `/api/tickets/${encode(ticketId)}/assignees`,
            {
                method: 'PUT',
                headers: versionHeader(version),
                body: { assigneeIds },
                signal: options.signal
            }
        );
    }
});

export const ticketsApi = createTicketsApi();
