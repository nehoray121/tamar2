import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const SectionExpandButton = ({ expanded, onClick, title }) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className="tamar-v22-expand-button inquiry-control dashboard-motion inline-flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
    >
        <Icon
            name="arrowUpStraight"
            className={`h-3.5 w-3.5 text-[var(--color-primary)] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
    </button>
);

export default SectionExpandButton;
