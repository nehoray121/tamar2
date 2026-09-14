import React from 'react';
import Icon from '../../components/common/Icon.jsx';

// Presentation only. Values/order/visibility/widths still come from the CURRENT canvas.
import { detailDisplayValue, detailFieldIcon } from './inquiryDetailPresentation.js';

export const InquiryDetailHeading = ({ section, sectionIndex }) => (
    <header className="tamar-ticket-readview-heading">
        <span aria-hidden="true"><Icon name={sectionIndex === 0 ? 'target' : 'search'} className="h-3.5 w-3.5" /></span>
        <h3 dir="auto">{section.title}</h3>
    </header>
);

export const InquiryDetailCard = ({ field, value }) => {
    const long = field.type === 'longtext' || field.id === 'description';
    return (
        <div data-inquiry-field-content={field.id} data-testid="ticket-detail-card" className={`tamar-ticket-detail-card${long ? ' tamar-ticket-detail-card--long' : ''}`}>
            <span className="tamar-ticket-detail-icon" aria-hidden="true">
                <Icon name={detailFieldIcon(field)} className="h-3.5 w-3.5" />
            </span>
            <dl className="tamar-ticket-detail-copy">
                <dt dir="auto">{field.name}</dt>
                <dd dir="auto">{detailDisplayValue(field, value)}</dd>
            </dl>
        </div>
    );
};
