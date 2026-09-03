import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const SectionExpandButton = ({ expanded, onClick, compact = false, title }) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className="dashboard-expand-button-v4a"
        data-compact={compact ? 'true' : 'false'}
    >
        <Icon
            name="arrowUpStraight"
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
            }`}
        />
    </button>
);

export default SectionExpandButton;
