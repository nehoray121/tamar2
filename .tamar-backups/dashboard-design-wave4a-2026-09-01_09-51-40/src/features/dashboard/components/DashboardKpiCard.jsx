import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const paletteByAccent = {
    blue: {
        value: 'text-blue-600 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-300',
        soft: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20'
    },
    emerald: {
        value: 'text-emerald-600 dark:text-emerald-300',
        icon: 'text-emerald-600 dark:text-emerald-300',
        soft: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
    },
    rose: {
        value: 'text-rose-600 dark:text-rose-300',
        icon: 'text-rose-600 dark:text-rose-300',
        soft: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'
    },
    amber: {
        value: 'text-amber-600 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-300',
        soft: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
    },
    violet: {
        value: 'text-violet-600 dark:text-violet-300',
        icon: 'text-violet-600 dark:text-violet-300',
        soft: 'bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20'
    },
    cyan: {
        value: 'text-cyan-600 dark:text-cyan-300',
        icon: 'text-cyan-600 dark:text-cyan-300',
        soft: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20'
    }
};

const DashboardKpiCard = ({
    title,
    subtitle,
    value,
    icon,
    accent,
    mode = 'dashboard',
    actionIcon,
    actionLabel,
    onAction,
    isActionDisabled = false,
    featured = false
}) => {
    const palette = paletteByAccent[accent] || paletteByAccent.blue;
    const isModal = mode === 'modal';

    return (
        <article
            data-accent={accent}
            data-mode={mode}
            data-featured={featured ? 'true' : 'false'}
            className={`tamar-v22-kpi-card group relative flex flex-col text-right ${isModal ? 'tamar-v22-kpi-card--modal' : ''}`}
        >
            {onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    aria-label={actionLabel}
                    title={actionLabel}
                    disabled={isActionDisabled}
                    className={`dashboard-kpi-delete-action inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-35 ${isModal ? 'absolute -left-4 top-2 z-20 h-7 w-7 rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-500' : 'absolute bottom-1 left-1/2 z-20 h-5 min-w-7 -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-1.5 text-rose-500 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100'}`}
                >
                    <Icon name={actionIcon} className={isModal ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
                </button>
            )}

            <div className="tamar-v22-kpi-top flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h4 className="tamar-v22-kpi-title truncate">{title}</h4>
                    {subtitle && (
                        <p className="tamar-v22-kpi-subtitle line-clamp-2">{subtitle}</p>
                    )}
                </div>
                <div className={`tamar-v22-kpi-icon flex shrink-0 items-center justify-center border ${palette.soft}`}>
                    <Icon name={icon} className={`h-3.5 w-3.5 ${palette.icon}`} />
                </div>
            </div>

            <div className="tamar-v22-kpi-bottom mt-auto">
                <div className={`tamar-v22-kpi-value ${featured ? '' : palette.value}`}>{value}</div>
                {!isModal && (
                    <div className="tamar-v22-kpi-helper">עודכן עכשיו</div>
                )}
            </div>
        </article>
    );
};

export default DashboardKpiCard;
