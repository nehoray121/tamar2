import React from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { useTheme } from '../../theme/ThemeContext.jsx';

const toneMap = {
    neutral: 'text-[var(--color-text-primary)]',
    primary: 'text-[var(--color-primary)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    danger: 'text-[var(--color-danger)]'
};

const severityMap = {
    critical: 'border-red-400/35 bg-red-500/10 text-red-500 dark:text-red-300',
    warning: 'border-amber-400/35 bg-amber-500/10 text-amber-500 dark:text-amber-300',
    info: 'border-blue-400/35 bg-blue-500/10 text-blue-500 dark:text-blue-300',
    success: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300'
};

export const SuperAdminCard = ({ children, className = '' }) => (
    <section className={`min-h-0 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] shadow-[0_12px_28px_rgba(15,23,42,0.07)] dark:shadow-none ${className}`}>{children}</section>
);

export const StatusBadge = ({ children, severity = 'info' }) => (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black ${severityMap[severity] || severityMap.info}`}>{children}</span>
);

export const MetricCard = ({ title, value, subtitle, icon = 'target', tone = 'primary', status }) => (
    <SuperAdminCard className="flex min-h-[78px] flex-col justify-between p-2.5">
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-[var(--color-text-muted)]">
            <span>{title}</span>
            <Icon name={icon} className="h-4 w-4 opacity-70" />
        </div>
        <div className={`mt-1.5 text-[24px] font-black leading-none ${toneMap[tone] || toneMap.primary}`}>{value}</div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-bold text-[var(--color-text-muted)]">
            <span>{subtitle}</span>
            {status && <span>{status}</span>}
        </div>
    </SuperAdminCard>
);

export const KpiStrip = ({ items }) => (
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
            <MetricCard key={item.id || item.title} title={item.title} value={item.value} subtitle={item.trend || item.subtitle} status={item.status} icon={item.icon} tone={item.tone || 'primary'} />
        ))}
    </div>
);

const chartWidth = 720;
const chartHeight = 240;
const chartPadding = { top: 22, right: 18, bottom: 34, left: 18 };

const buildSeriesPoints = (data, key) => {
    const values = data.map((item) => Number(item[key]) || 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const usableWidth = chartWidth - chartPadding.left - chartPadding.right;
    const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    return data.map((item, index) => {
        const value = Number(item[key]) || 0;
        const x = chartPadding.left + ((index / Math.max(data.length - 1, 1)) * usableWidth);
        const y = chartPadding.top + (usableHeight - (((value - min) / Math.max(max - min, 1)) * usableHeight));
        return {
            label: item.label,
            axisLabel: item.axisLabel ?? item.label,
            value,
            x,
            y
        };
    });
};

const buildLinePath = (points) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
const buildGridLines = () => [0.2, 0.4, 0.6, 0.8].map((ratio) => chartPadding.top + ((chartHeight - chartPadding.top - chartPadding.bottom) * ratio));

export const MiniLineChart = ({ data, title, subtitle, headerControls = null, emptyText = 'אין נתונים להצגה' }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const palette = isDark ? {
        cardClass: 'border-[rgba(96,165,250,0.25)] bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.98))]',
        glow: 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_68%)]',
        title: '#F8FAFC',
        subtitle: '#94A3B8',
        legendBorder: 'rgba(255,255,255,0.1)',
        legendBg: 'rgba(255,255,255,0.05)',
        innerClass: 'border-white/6 bg-white/[0.03]',
        tooltipClass: 'border-white/10 bg-slate-950/88 shadow-[0_16px_40px_rgba(15,23,42,0.45)]',
        tooltipPrimary: '#F8FAFC',
        tooltipSecondary: '#94A3B8',
        grid: 'rgba(148,163,184,0.14)',
        axis: '#94A3B8',
        markerStroke: '#DBEAFE',
        activeGuide: 'rgba(96,165,250,0.24)',
        emptyText: '#CBD5E1'
    } : {
        cardClass: 'border-[rgba(96,165,250,0.18)] bg-[linear-gradient(180deg,#ffffff,#f8fbff)]',
        glow: 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_70%)]',
        title: '#0F172A',
        subtitle: '#64748B',
        legendBorder: 'rgba(148,163,184,0.24)',
        legendBg: 'rgba(255,255,255,0.92)',
        innerClass: 'border-slate-200 bg-slate-50/80',
        tooltipClass: 'border-slate-200 bg-white/95 shadow-[0_16px_36px_rgba(148,163,184,0.22)]',
        tooltipPrimary: '#0F172A',
        tooltipSecondary: '#64748B',
        grid: 'rgba(148,163,184,0.18)',
        axis: '#64748B',
        markerStroke: '#EFF6FF',
        activeGuide: 'rgba(59,130,246,0.18)',
        emptyText: '#64748B'
    };
    const closedPoints = React.useMemo(() => buildSeriesPoints(data, 'closed'), [data]);
    const openedPoints = React.useMemo(() => buildSeriesPoints(data, 'opened'), [data]);
    const closedPath = React.useMemo(() => buildLinePath(closedPoints), [closedPoints]);
    const openedPath = React.useMemo(() => buildLinePath(openedPoints), [openedPoints]);
    const [activeIndex, setActiveIndex] = React.useState(null);
    const activeClosed = activeIndex === null ? null : closedPoints[activeIndex];
    const activeOpened = activeIndex === null ? null : openedPoints[activeIndex];
    const hasActivity = data.some((item) => (Number(item.opened) || 0) > 0 || (Number(item.closed) || 0) > 0);

    return (
        <SuperAdminCard className={`relative flex h-full min-h-0 flex-col overflow-hidden p-4 ${palette.cardClass}`}>
            <div className={`pointer-events-none absolute inset-x-5 top-0 h-24 rounded-b-[32px] ${palette.glow}`} />
            <div className="relative mb-3 flex shrink-0 flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="text-[18px] font-black" style={{ color: palette.title }}>{title}</h3>
                    {subtitle && <p className="mt-1 text-[12px] font-bold" style={{ color: palette.subtitle }}>{subtitle}</p>}
                </div>
                <div className="flex max-w-full flex-col items-start gap-2">
                    {headerControls}
                    <div className="flex flex-wrap items-center gap-3 rounded-full px-3 py-1.5 text-[11px] font-black backdrop-blur-sm" style={{ border: `1px solid ${palette.legendBorder}`, background: palette.legendBg }}>
                        <span className="inline-flex items-center gap-1.5 text-[#3B82F6]"><span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_10px_rgba(59,130,246,0.45)]" />נסגרו</span>
                        <span className="inline-flex items-center gap-1.5 text-[#F59E0B]"><span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.35)]" />נפתחו</span>
                    </div>
                </div>
            </div>
            <div className={`relative min-h-0 flex-1 rounded-[20px] border px-2 pb-2 pt-3 ${palette.innerClass}`}>
                {!hasActivity ? (
                    <div className="flex h-full min-h-[250px] items-center justify-center px-6 text-center text-[14px] font-black" style={{ color: palette.emptyText }}>
                        {emptyText}
                    </div>
                ) : (
                    <>
                        {activeClosed && activeOpened && <div className={`pointer-events-none absolute right-4 top-4 z-10 min-w-[138px] rounded-2xl px-3 py-2 text-right backdrop-blur-md ${palette.tooltipClass}`}><div className="text-[11px] font-black" style={{ color: palette.tooltipPrimary }}>{activeClosed.label}</div><div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: palette.tooltipSecondary }}><span>נסגרו</span><span style={{ color: palette.tooltipPrimary }}>{activeClosed.value}</span></div><div className="mt-1 flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: palette.tooltipSecondary }}><span>נפתחו</span><span style={{ color: palette.tooltipPrimary }}>{activeOpened.value}</span></div></div>}
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full min-h-[250px] w-full" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="closed-line-gradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#60A5FA" />
                                    <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                                <linearGradient id="closed-area-gradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(59,130,246,0.24)" />
                                    <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                                </linearGradient>
                            </defs>
                            {buildGridLines().map((y) => <line key={y} x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke={palette.grid} strokeDasharray="5 10" />)}
                            <path d={`${closedPath} L ${closedPoints[closedPoints.length - 1]?.x || chartWidth - chartPadding.right} ${chartHeight - chartPadding.bottom} L ${closedPoints[0]?.x || chartPadding.left} ${chartHeight - chartPadding.bottom} Z`} fill="url(#closed-area-gradient)" />
                            <path d={openedPath} fill="none" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                            <path d={closedPath} fill="none" stroke="url(#closed-line-gradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            {closedPoints.map((point, index) => <g key={point.label}><circle cx={point.x} cy={point.y} r={activeIndex === index ? 6 : 4} fill="#3B82F6" stroke={palette.markerStroke} strokeWidth={activeIndex === index ? 2.5 : 1.5} className="cursor-pointer transition-all duration-200" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex((current) => current === index ? null : current)}><title>{`${point.label}: נסגרו ${point.value}, נפתחו ${openedPoints[index]?.value || 0}`}</title></circle>{activeIndex === index && <line x1={point.x} x2={point.x} y1={chartPadding.top} y2={chartHeight - chartPadding.bottom} stroke={palette.activeGuide} strokeDasharray="4 8" />}</g>)}
                            {openedPoints.map((point) => <circle key={`opened-${point.label}`} cx={point.x} cy={point.y} r="2.4" fill="#F59E0B" opacity="0.92" />)}
                            {closedPoints.map((point) => <text key={`label-${point.label}`} x={point.x} y={chartHeight - 10} textAnchor="middle" fill={palette.axis} fontSize="11" fontWeight="700">{point.axisLabel}</text>)}
                        </svg>
                    </>
                )}
            </div>
        </SuperAdminCard>
    );
};

export const BarList = ({ title, subtitle, items, accent = '#3b82f6' }) => {
    const max = Math.max(...items.map((item) => item.value), 1);
    return (
        <SuperAdminCard className="flex h-full min-h-0 flex-col p-3">
            <div className="mb-3 shrink-0">
                <h3 className="text-[15px] font-black text-[var(--color-text-primary)]">{title}</h3>
                {subtitle && <p className="mt-0.5 text-[12px] font-bold text-[var(--color-text-muted)]">{subtitle}</p>}
            </div>
            <div className="min-h-0 flex-1 space-y-2">
                {items.slice(0, 6).map((item, index) => (
                    <div key={`${item.label}-${index}`} className="grid grid-cols-[90px_minmax(0,1fr)_38px] items-center gap-2 text-[12px] font-bold text-[var(--color-text-secondary)]">
                        <span className="truncate">{item.label}</span>
                        <div className="h-6 overflow-hidden rounded-md bg-[var(--color-surface-muted)]">
                            <div className="h-full rounded-md" style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: index === 0 ? '#f59e0b' : accent }} />
                        </div>
                        <span className="text-left text-[var(--color-text-primary)]">{item.value}</span>
                    </div>
                ))}
            </div>
        </SuperAdminCard>
    );
};

export const CompactTable = ({ columns, rows, onRowClick, emptyText = 'אין נתונים להצגה' }) => (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]">
        <div className="grid bg-[var(--color-surface-muted)] px-3 py-2 text-[11px] font-black text-[var(--color-text-muted)]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((column) => <span key={column}>{column}</span>)}
        </div>
        {rows.length ? rows.map((row) => (
            <button
                key={row.id}
                type="button"
                onClick={() => onRowClick?.(row)}
                className="grid w-full border-t border-[var(--color-border)] px-3 py-2 text-right text-[12px] font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)]"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            >
                {row.cells.map((cell, index) => <span key={`${row.id}-${index}`} className="min-w-0 truncate">{cell}</span>)}
            </button>
        )) : <div className="px-3 py-8 text-center text-[12px] font-bold text-[var(--color-text-muted)]">{emptyText}</div>}
    </div>
);

export const Drawer = ({ title, subtitle = 'התוכן מוצג בתוך חלונית ניהול מימין.', item, onClose, children, widthClassName = 'max-w-md' }) => {
    if (!item) return null;
    return (
        <div className="fixed inset-0 z-[90] bg-slate-950/30 backdrop-blur-sm" dir="rtl" onClick={onClose}>
            <aside className={`absolute inset-y-0 right-0 h-full w-full ${widthClassName} overflow-y-auto border-l border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-5 shadow-2xl animate-[slideInFromRight_180ms_ease-out]`} onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-[18px] font-black text-[var(--color-text-primary)]">{title}</h3>
                        <p className="mt-1 text-[12px] font-bold text-[var(--color-text-muted)]">{subtitle}</p>
                    </div>
                    <button type="button" onClick={onClose} className="inquiry-control flex h-9 w-9 items-center justify-center rounded-xl p-0"><Icon name="close" className="h-4 w-4" /></button>
                </div>
                {children}
            </aside>
        </div>
    );
};
