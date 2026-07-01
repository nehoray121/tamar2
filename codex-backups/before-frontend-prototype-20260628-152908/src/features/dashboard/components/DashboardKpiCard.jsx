import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

        const DashboardKpiCard = ({ title, subtitle, value, icon, accent, mode = 'dashboard', actionIcon, actionLabel, onAction, isActionDisabled = false }) => {
            const palette = {
                blue: {
                    value: 'text-blue-600',
                    icon: 'text-blue-500',
                    iconBg: 'bg-blue-50',
                    iconBorder: 'border-blue-100',
                    border: 'border-blue-100',
                    shadow: 'shadow-[0_12px_28px_rgba(59,130,246,0.10)]'
                },
                emerald: {
                    value: 'text-emerald-600',
                    icon: 'text-emerald-600',
                    iconBg: 'bg-emerald-50',
                    iconBorder: 'border-emerald-100',
                    border: 'border-emerald-100',
                    shadow: 'shadow-[0_12px_28px_rgba(16,185,129,0.10)]'
                },
                rose: {
                    value: 'text-rose-600',
                    icon: 'text-rose-500',
                    iconBg: 'bg-rose-50',
                    iconBorder: 'border-rose-100',
                    border: 'border-rose-100',
                    shadow: 'shadow-[0_12px_28px_rgba(244,63,94,0.10)]'
                },
                amber: {
                    value: 'text-amber-600',
                    icon: 'text-amber-500',
                    iconBg: 'bg-amber-50',
                    iconBorder: 'border-amber-100',
                    border: 'border-amber-100',
                    shadow: 'shadow-[0_12px_28px_rgba(245,158,11,0.10)]'
                },
                violet: {
                    value: 'text-violet-600',
                    icon: 'text-violet-500',
                    iconBg: 'bg-violet-50',
                    iconBorder: 'border-violet-100',
                    border: 'border-violet-100',
                    shadow: 'shadow-[0_12px_28px_rgba(139,92,246,0.10)]'
                },
                cyan: {
                    value: 'text-cyan-600',
                    icon: 'text-cyan-500',
                    iconBg: 'bg-cyan-50',
                    iconBorder: 'border-cyan-100',
                    border: 'border-cyan-100',
                    shadow: 'shadow-[0_12px_28px_rgba(6,182,212,0.10)]'
                }
            }[accent];

            const isModal = mode === 'modal';

            return (
                <article className={`group relative flex h-full flex-col rounded-[22px] border bg-white text-right ${palette.border} ${palette.shadow} ${isModal ? 'min-h-[168px] px-4 pb-4 pt-5' : 'h-[clamp(104px,12vh,118px)] min-h-[104px] px-3 pb-2.5 pt-2.5'} ${!isModal ? 'dashboard-card-motion' : ''}`}>
                    {onAction && (
                        <button
                            type="button"
                            onClick={onAction}
                            aria-label={actionLabel}
                            title={actionLabel}
                            disabled={isActionDisabled}
                            className={`inline-flex items-center justify-center transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-35 ${
                                isModal
                                    ? `absolute left-3 top-3 h-7 w-7 rounded-full border border-transparent ${
                                        actionIcon === 'trash' || actionIcon === 'minus'
                                            ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600'
                                            : 'text-blue-400 hover:bg-blue-50 hover:text-blue-500'
                                    }`
                                    : `absolute bottom-2 left-1/2 h-5 min-w-[28px] -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50/95 px-1.5 text-rose-500 shadow-[0_6px_14px_rgba(244,63,94,0.14)] opacity-0 pointer-events-none translate-y-1 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 hover:bg-rose-100 hover:text-rose-600`
                            }`}
                        >
                            <Icon name={actionIcon} className={isModal ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
                        </button>
                    )}

                    <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1 pr-1">
                            <h4 className={`font-black text-slate-900 ${isModal ? 'text-[10px] leading-5' : 'text-[13px] leading-5'}`}>{title}</h4>
                            {subtitle && <p className={`mt-0.5 text-slate-400 ${isModal ? 'text-[10px] leading-4' : 'text-[10px] leading-4'}`}>{subtitle}</p>}
                        </div>
                        <div className={`flex shrink-0 items-center justify-center border ${palette.iconBg} ${palette.iconBorder} ${isModal ? 'h-12 w-12 rounded-[18px]' : 'h-8 w-8 rounded-[14px]'}`}>
                            <Icon name={icon} className={`${isModal ? 'h-5 w-5' : 'h-[13px] w-[13px]'} ${palette.icon}`} />
                        </div>
                    </div>

                    <div className={`mt-auto ${isModal ? 'pt-5' : 'pt-1.5 pb-5'}`}>
                        <div className={`font-black tracking-tight ${palette.value} ${isModal ? 'text-[44px] leading-none' : 'text-[34px] leading-none'}`}>{value}</div>
                        {!isModal && <div className="mt-1.5 text-[10px] font-semibold text-slate-400">עודכן עכשיו</div>}
                    </div>
                </article>
            );
        };

export default DashboardKpiCard;
