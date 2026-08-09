import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

        const SectionExpandButton = ({ expanded, onClick, compact = false, title }) => (
            <button
                type="button"
                title={title}
                aria-label={title}
                onClick={onClick}
                className={`dashboard-motion flex items-center gap-2 rounded-2xl border border-slate-200 bg-white font-black text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-md active:scale-95 ${
                    compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
                }`}
            >
                <Icon
                    name="arrowUpStraight"
                    className={`h-3.5 w-3.5 text-blue-500 transition-transform duration-300 ease-out ${expanded ? 'rotate-180' : ''}`}
                />
                <span>{expanded ? 'מזער' : 'הרחבה'}</span>
            </button>
        );

export default SectionExpandButton;
