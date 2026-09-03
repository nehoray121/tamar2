import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const DashboardKpiCard = ({
    title,
    subtitle,
    value,
    icon,
    mode = 'dashboard',
    actionIcon,
    actionLabel,
    onAction,
    isActionDisabled = false,
    featured = false
}) => {
    const isModal = mode === 'modal';
    const isDeleteAction = actionIcon === 'trash' || actionIcon === 'minus';

    const renderActionIcon = () => {
        if (isDeleteAction) {
            return (
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="tamar-claude-kpi__trash-svg"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M3.5 6.5h17" />
                    <path d="M9 6.5V5.2c0-.66.54-1.2 1.2-1.2h3.6c.66 0 1.2.54 1.2 1.2v1.3" />
                    <path d="M6.8 6.5l.92 11.03A2 2 0 0 0 9.71 19.4h4.58a2 2 0 0 0 1.99-1.87L17.2 6.5" />
                    <path d="M10.25 10.2v4.9" />
                    <path d="M13.75 10.2v4.9" />
                </svg>
            );
        }

        return (
            <Icon
                name={actionIcon}
                className={isModal ? 'h-4 w-4' : 'h-3.5 w-3.5'}
            />
        );
    };

    return (
        <article
            className={`tamar-claude-kpi ${
                isModal ? 'tamar-claude-kpi--modal' : ''
            }`}
            data-featured={featured && !isModal ? 'true' : 'false'}
        >
            {onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    aria-label={actionLabel}
                    title={actionLabel}
                    disabled={isActionDisabled}
                    className={`tamar-claude-kpi__action ${
                        isDeleteAction
                            ? 'tamar-claude-kpi__action--delete'
                            : ''
                    }`}
                >
                    {renderActionIcon()}
                </button>
            )}

            <div className="tamar-claude-kpi__head">
                <div className="tamar-claude-kpi__titles">
                    <div className="tamar-claude-kpi__title">{title}</div>
                    {subtitle && (
                        <div className="tamar-claude-kpi__subtitle">
                            {subtitle}
                        </div>
                    )}
                </div>

                <span className="tamar-claude-kpi__icon">
                    <Icon name={icon} className="h-[15px] w-[15px]" />
                </span>
            </div>

            <div className="tamar-claude-kpi__footer">
                <strong className="tamar-claude-kpi__value">{value}</strong>
            </div>
        </article>
    );
};

export default DashboardKpiCard;
