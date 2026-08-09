import { authenticatedHttpClient } from '../boards/api/authenticatedHttpClient.js';


export const closeInquiryService = {
    async closeInquiry(inquiryId, payload, ticketVersion) {
        const version = Number(ticketVersion);
        if (!Number.isSafeInteger(version) || version < 1) {
            throw new Error('גרסת הפנייה חסרה. יש לרענן את הרשימה ולנסות שוב.');
        }
        const response = await authenticatedHttpClient(`/api/tickets/${encodeURIComponent(inquiryId)}/close`, {
            method: 'POST',
            headers: { 'If-Match': `"${version}"` },
            body: { closureSummary: payload.summary.trim() }
        });
        return response.data;
    }
};