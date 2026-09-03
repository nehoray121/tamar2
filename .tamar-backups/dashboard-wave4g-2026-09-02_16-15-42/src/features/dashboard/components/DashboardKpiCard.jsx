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
            data-accent={accent}
            data-mode={mode}
            data-featured={featured && !isModal ? 'true' : 'false'}
            className={`dashboard-kpi-card-v4a ${isModal ? 'dashboard-kpi-card-v4a--modal' : ''}`}
            style={{ '--kpi-accent': accentColor }}
        >
            {onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    aria-label={actionLabel}
                    title={actionLabel}
                    disabled={isActionDisabled}
                    className={
                        isModal
                            ? 'dashboard-kpi-card-v4a__action dashboard-kpi-card-v4a__action--modal'
                            : 'dashboard-kpi-card-v4a__action'
                    }
                >
                    <Icon
                        name={actionIcon}
                        className={isModal ? 'h-3.5 w-3.5' : 'h-3 w-3'}
                    />
                </button>
            )}

            <div className="dashboard-kpi-card-v4a__head">
                <div className="min-w-0">
                    <h4 className="dashboard-kpi-card-v4a__title">{title}</h4>
                    {subtitle && (
                        <p className="dashboard-kpi-card-v4a__subtitle">{subtitle}</p>
                    )}
                </div>

                <span className="dashboard-kpi-card-v4a__icon">
                    <Icon
                        name={icon}
                        className={isModal ? 'h-[18px] w-[18px]' : 'h-[15px] w-[15px]'}
                    />
                </span>
            </div>

            <div className="dashboard-kpi-card-v4a__metric">
                <div className="dashboard-kpi-card-v4a__value">{value}</div>
                {!isModal && (
                    <div className="dashboard-kpi-card-v4a__helper">עודכן עכשיו</div>
                )}
            </div>
        </article>
    );
};

export default DashboardKpiCard;
