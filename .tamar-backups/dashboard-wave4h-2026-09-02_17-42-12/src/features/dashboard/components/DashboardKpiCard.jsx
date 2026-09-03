import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const ACCENT_COLORS = {
    blue: 'var(--color-primary)',
    emerald: 'var(--color-success)',
    rose: 'var(--color-danger)',
    amber: 'var(--color-warning)',
    violet: 'var(--color-info)',
    cyan: 'var(--color-info)'
};

const DashboardKpiCard = ({
    title,
    subtitle,
    value,
    icon,
    accent = 'blue',
    mode = 'dashboard',
    actionIcon,
    actionLabel,
    onAction,
    isActionDisabled = false,
    featured = false
}) => {
    const isModal = mode === 'modal';
    const accentColor = ACCENT_COLORS[accent] || 'var(--color-primary)';

    return (
        <article
            className={`dashboard-v4g-kpi ${
                isModal ? 'dashboard-v4g-kpi--modal' : ''
            }`}
            data-featured={featured && !isModal ? 'true' : 'false'}
            style={{ '--kpi-accent': accentColor }}
        >
            {onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    aria-label={actionLabel}
                    title={actionLabel}
                    disabled={isActionDisabled}
                    className="dashboard-v4g-kpi__action"
                >
                    <Icon
                        name={actionIcon}
                        className={isModal ? 'h-3.5 w-3.5' : 'h-3 w-3'}
                    />
                </button>
            )}

            <div className="dashboard-v4g-kpi__head">
                <div className="dashboard-v4g-kpi__titles">
                    <h4 className="dashboard-v4g-kpi__title">{title}</h4>
                    {subtitle && (
                        <p className="dashboard-v4g-kpi__subtitle">
                            {subtitle}
                        </p>
                    )}
                </div>

                <span className="dashboard-v4g-kpi__icon">
                    <Icon
                        name={icon}
                        className={isModal ? 'h-[18px] w-[18px]' : 'h-[15px] w-[15px]'}
                    />
                </span>
            </div>

            <div className="dashboard-v4g-kpi__footer">
                <strong className="dashboard-v4g-kpi__value">{value}</strong>
                {!isModal && (
                    <span className="dashboard-v4g-kpi__helper">
                        עודכן עכשיו
                    </span>
                )}
            </div>
        </article>
    );
};

export default DashboardKpiCard;
