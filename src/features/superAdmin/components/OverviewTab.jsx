import React, { useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { Drawer, KpiStrip, MiniLineChart, StatusBadge, SuperAdminCard } from './SuperAdminPrimitives.jsx';

const severityLabel = {
    critical: 'קריטי',
    warning: 'אזהרה',
    info: 'מידע',
    success: 'תקין'
};

const TREND_PRESETS = [
    { value: '7d', label: '7 ימים' },
    { value: '14d', label: '14 ימים' },
    { value: '30d', label: '30 ימים' },
    { value: 'custom', label: 'טווח מותאם' }
];

const TrendRangeControls = ({ trendFilter, trendBounds, onTrendPresetChange, onTrendCustomRangeChange, onTrendApply, onTrendReset }) => {
    const isCustom = trendFilter.preset === 'custom';

    return (
        <div className="flex max-w-full flex-col items-start gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1">
                {TREND_PRESETS.map((preset) => {
                    const isActive = trendFilter.preset === preset.value;
                    return (
                        <button
                            key={preset.value}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => onTrendPresetChange(preset.value)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${isActive
                                ? 'bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)]'
                                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]'}`}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>

            {isCustom && (
                <div className="flex max-w-full flex-wrap items-end gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2">
                    <label className="flex flex-col gap-1 text-[10px] font-black text-[var(--color-text-muted)]">
                        <span>מתאריך</span>
                        <input
                            type="date"
                            value={trendFilter.customRange.from}
                            min={trendBounds?.minDate || undefined}
                            max={trendBounds?.maxDate || undefined}
                            onChange={(event) => onTrendCustomRangeChange('from', event.target.value)}
                            className="h-9 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 text-[12px] font-bold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] font-black text-[var(--color-text-muted)]">
                        <span>עד תאריך</span>
                        <input
                            type="date"
                            value={trendFilter.customRange.to}
                            min={trendFilter.customRange.from || trendBounds?.minDate || undefined}
                            max={trendBounds?.maxDate || undefined}
                            onChange={(event) => onTrendCustomRangeChange('to', event.target.value)}
                            className="h-9 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 text-[12px] font-bold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)]"
                        />
                    </label>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onTrendApply} className="h-9 rounded-xl bg-[var(--color-primary)] px-4 text-[12px] font-black text-white transition hover:brightness-110">
                            החל
                        </button>
                        <button type="button" onClick={onTrendReset} className="text-[11px] font-black text-[var(--color-primary)] transition hover:opacity-80">
                            איפוס
                        </button>
                    </div>
                    {trendFilter.validation && <p className="w-full text-[11px] font-bold text-[var(--color-danger)]">{trendFilter.validation}</p>}
                </div>
            )}
        </div>
    );
};

const OverviewTab = ({
    data,
    onOpenAttention,
    trendFilter,
    trendBounds,
    onTrendPresetChange,
    onTrendCustomRangeChange,
    onTrendApply,
    onTrendReset
}) => {
    const [drawerItem, setDrawerItem] = useState(null);

    return (
        <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden">
            <KpiStrip items={data.overview.kpis} />
            <div className="grid min-h-0 flex-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <MiniLineChart
                    title="מגמת פעילות לאורך זמן"
                    subtitle={data.overview.trendSubtitle}
                    data={data.overview.trend}
                    emptyText="אין נתוני פעילות בטווח התאריכים שנבחר."
                    headerControls={
                        <TrendRangeControls
                            trendFilter={trendFilter}
                            trendBounds={trendBounds}
                            onTrendPresetChange={onTrendPresetChange}
                            onTrendCustomRangeChange={onTrendCustomRangeChange}
                            onTrendApply={onTrendApply}
                            onTrendReset={onTrendReset}
                        />
                    }
                />
                <SuperAdminCard className="flex min-h-0 flex-col p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[14px] font-black text-[var(--color-text-primary)]">דורש תשומת לב</h3>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-[11px] font-black text-red-500">{data.overview.attention.length}</span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2">
                        {data.overview.attention.slice(0, 3).map((item) => (
                            <button key={item.id} type="button" onClick={() => setDrawerItem(item)} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5 text-right transition hover:border-[var(--color-primary)]">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[12px] font-black text-[var(--color-text-primary)]">{item.title}</span>
                                    <Icon name="alertTriangle" className="h-4 w-4 text-red-500" />
                                </div>
                                <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--color-text-secondary)]">{item.explanation}</p>
                                <div className="mt-1.5 text-[10px] font-bold text-[var(--color-text-muted)]">{item.entity}</div>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (onOpenAttention) {
                                onOpenAttention();
                                return;
                            }
                            setDrawerItem({
                                title: 'כל ההתראות',
                                explanation: 'פירוט מלא של כלל ההתראות מוצג בבקרת מערכת.',
                                action: 'פתח בקרת מערכת'
                            });
                        }}
                        className="mt-2 h-7 shrink-0 rounded-lg border border-[var(--color-border-strong)] text-[12px] font-black text-[var(--color-primary)]"
                    >
                        הצג הכל
                    </button>
                </SuperAdminCard>
            </div>
            <Drawer title={drawerItem?.title || 'פרטים'} item={drawerItem} onClose={() => setDrawerItem(null)}>
                <div className="space-y-3 text-[13px] font-semibold leading-6 text-[var(--color-text-secondary)]">
                    {drawerItem?.severity && <StatusBadge severity={drawerItem.severity}>{severityLabel[drawerItem.severity]}</StatusBadge>}
                    <p>{drawerItem?.explanation}</p>
                    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><b>פעולה מומלצת:</b> {drawerItem?.action}</div>
                </div>
            </Drawer>
        </div>
    );
};

export default OverviewTab;
