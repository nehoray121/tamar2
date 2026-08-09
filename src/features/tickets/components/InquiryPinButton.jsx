import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryPinButton = ({ pinned, loading, readOnly = false, onClick, testId }) => {
    const title = readOnly
        ? 'נעיצה משותפת בחדר - אין הרשאה לשינוי'
        : pinned ? 'בטל נעיצה משותפת' : 'נעץ פנייה בלוח החדר';

    return (
        <button
            data-testid={testId}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={pinned}
            onClick={(event) => {
                event.stopPropagation();
                if (!readOnly) onClick?.(event);
            }}
            disabled={loading || readOnly}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:opacity-70 ${
                pinned
                    ? 'border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-400/50 dark:bg-cyan-500/20 dark:text-cyan-200'
                    : 'inquiry-control text-slate-500 dark:text-slate-300'
            } ${readOnly ? 'cursor-default' : 'hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-500/15'}`}
        >
            <Icon name="pin" className="h-4 w-4" />
        </button>
    );
};

export default InquiryPinButton;