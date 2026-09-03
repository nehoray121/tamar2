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
                    className="tamar-claude-kpi__action"
                >
                    <Icon
                        name={actionIcon}
                        className={isModal ? 'h-3.5 w-3.5' : 'h-3 w-3'}
                    />
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
