import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

        const DashboardKpiCard = ({ title, subtitle, value, icon, accent, mode = 'dashboard', actionIcon, actionLabel, onAction, isActionDisabled = false }) => {
            const palette = {
                blue: {
                    value: 'text-blue-600 dark:text-blue-400',
                    icon: 'text-blue-500 dark:text-blue-400',
                    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
                    iconBorder: 'border-blue-100 dark:border-blue-500/20',
                    border: 'border-blue-100 dark:border-blue-500/20',
                    shadow: 'shadow-[0_12px_28px_rgba(59,130,246,0.10)] dark:shadow-none'
                },
                emerald: {
                    value: 'text-emerald-600 dark:text-emerald-400',
                    icon: 'text-emerald-600 dark:text-emerald-400',
                    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
                    iconBorder: 'border-emerald-100 dark:border-emerald-500/20',
                    border: 'border-emerald-100 dark:border-emerald-500/20',
                    shadow: 'shadow-[0_12px_28px_rgba(16,185,129,0.10)] dark:shadow-none'
                },
                rose: {
                    value: 'text-rose-600 dark:text-rose-400',
                    icon: 'text-rose-500 dark:text-rose-400',
                    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
                    iconBorder: 'border-rose-100 dark:border-rose-500/20',
                    border: 'border-rose-100 dark:border-rose-500/20',
                    shadow: 'shadow-[0_12px_28px_rgba(244,63,94,0.10)] dark:shadow-none'
                },
                amber: {
                    value: 'text-amber-600 dark:text-amber-400',
                    icon: 'text-amber-500 dark:text-amber-400',
                    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
                    iconBorder: 'border-amber-100 dark:border-amber-500/20',
                    border: 'border-amber-100 dark:border-amber-500/20',
                    shadow: 'shadow-[0_12px_28px_rgba(245,158,11,0.10)] dark:shadow-none'
                },
                violet: {
                    value: 'text-violet-600 dark:text-violet-400',
                    icon: 'text-violet-500 dark:text-violet-400',
                    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
                    iconBorder: 'border-violet-100 dark:border-violet-500/20',
                    border: 'border-violet-100 dark:border-violet-500/20',
                    shadow: 'shadow-[0_12px_28px_rgba(139,92,246,0.10)] dark:shadow-none'
                },
                cyan: {
                    value: 'text-cyan-600 dark:text-cyan-400',
                    icon: 'text-cyan-500 dark:text-cyan-400',
                    iconBg: 'bg-cyan-50 dark:bg-cyan-500/10',
                    iconBorder: 'border-cyan-100 dark:border-cyan-500/20',
                    border: 'border-cyan-100 dark:border-cyan-500/20',
                    shadow: 'shadow-[0_12px_28px_rgba(6,182,212,0.10)] dark:shadow-none'
                }
            }[accent];

            const isModal = mode === 'modal';

            return (
                <article className={`group relative flex flex-col rounded-[20px] border bg-[var(--color-surface-raised)] text-right ${palette.border} ${palette.shadow} ${isModal ? 'h-auto min-h-[148px] px-4 pb-3 pt-4' : 'h-full h-[clamp(106px,11vh,114px)] min-h-[106px] px-2.5 pb-1.5 pt-2'} ${!isModal ? 'dashboard-card-motion' : ''}`}>
                    {onAction && (
                        <button
                            type="button"
                            onClick={onAction}
                            aria-label={actionLabel}
                            title={actionLabel}
                            disabled={isActionDisabled}
                            className={`inline-flex items-center justify-center transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-35 ${
                                isModal
                                    ? `dashboard-kpi-delete-action absolute -left-4 top-2 z-20 h-7 w-7 rounded-full border border-transparent ${
                                        actionIcon === 'trash' || actionIcon === 'minus'
                                            ? 'border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300'
                                            : 'text-blue-400 hover:bg-blue-50 hover:text-blue-500'
                                    }`
                                    : `absolute bottom-1 left-1/2 h-4 min-w-[24px] -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50/95 px-1.5 text-rose-500 shadow-[0_5px_12px_rgba(244,63,94,0.13)] opacity-0 pointer-events-none translate-y-1 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 hover:bg-rose-100 hover:text-rose-600`
                            }`}
                        >
                            <Icon name={actionIcon} className={isModal ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
                        </button>
                    )}

                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 pr-1">
                            <h4 className={`font-black text-[var(--color-text-primary)] ${isModal ? 'text-[10px] leading-5' : 'text-[12px] leading-[16px]'}`}>{title}</h4>
                            {subtitle && <p className={`mt-0.5 text-[var(--color-text-muted)] ${isModal ? 'text-[10px] leading-4' : 'text-[10px] leading-[13px]'}`}>{subtitle}</p>}
                        </div>
                        <div className={`flex shrink-0 items-center justify-center border ${palette.iconBg} ${palette.iconBorder} ${isModal ? 'h-12 w-12 rounded-[18px]' : 'h-6 w-6 rounded-[12px]'}`}>
                            <Icon name={icon} className={`${isModal ? 'h-5 w-5' : 'h-3 w-3'} ${palette.icon}`} />
                        </div>
                    </div>

                    <div className={`mt-auto ${isModal ? 'pt-5' : 'pt-0.5 pb-2.5'}`}>
                        <div className={`font-black tracking-tight ${palette.value} ${isModal ? 'text-[36px] leading-none' : 'text-[26px] leading-none'}`}>{value}</div>
                        {!isModal && <div className="mt-1 text-[10px] font-semibold text-[var(--color-text-muted)]">עודכן עכשיו</div>}
                    </div>
                </article>
            );
        };

export default DashboardKpiCard;



