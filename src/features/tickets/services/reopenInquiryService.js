import { authenticatedHttpClient } from '../boards/api/authenticatedHttpClient.js';

const requireTicketVersion = (ticketVersion) => {
    const version = Number(ticketVersion);

    if (!Number.isSafeInteger(version) || version < 1) {
        throw new Error(
            'גרסת הפנייה חסרה. יש לרענן את הרשימה ולנסות שוב.'
        );
    }

    return version;
};

export const reopenInquiryService = {
    async reopenInquiry(inquiryId, ticketVersion) {
        const version = requireTicketVersion(ticketVersion);
        const response = await authenticatedHttpClient(
            `/api/tickets/${encodeURIComponent(inquiryId)}/reopen`,
            {
                method: 'POST',
                headers: {
                    'If-Match': `"${version}"`
                },
                body: {}
            }
        );

        return response.data;
    }
};
