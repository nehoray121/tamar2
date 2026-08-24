import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const SectionExpandButton = ({ expanded, onClick, compact = false, title }) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={`tamar-reference-expand-button inquiry-control dashboard-motion flex items-center gap-2 rounded-2xl font-black shadow-sm hover:-translate-y-0.5 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 dark:focus-visible:ring-blue-300/30 ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
    >
        <Icon
            name="arrowUpStraight"
            className={`h-3.5 w-3.5 text-blue-500 transition-transform duration-300 ease-out dark:text-blue-300 ${expanded ? 'rotate-180' : ''}`}
        />
        <span>{expanded ? 'מזער' : 'הרחבה'}</span>
    </button>
);

export default SectionExpandButton;
