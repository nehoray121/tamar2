import React from 'react';
import Icon from '../../../components/common/TamarIcon.jsx';

const SectionExpandButton = ({ expanded, onClick, title }) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className="tamar-claude-expand-btn"
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
