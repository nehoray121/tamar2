import { inquiryOrganizationService } from './inquiryOrganizationService.js';

// Temporary frontend adapter. Replace with a real close-inquiry API endpoint later.
export const closeInquiryService = {
    closeInquiry(inquiryId, payload) {
        return inquiryOrganizationService.closeInquiry(inquiryId, payload);
    }
};
