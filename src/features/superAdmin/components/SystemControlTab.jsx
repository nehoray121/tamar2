import React, { useMemo, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { Drawer, MetricCard, StatusBadge, SuperAdminCard } from './SuperAdminPrimitives.jsx';

const severityLabel = { critical: 'קריטי', warning: 'אזהרה', info: 'מידע', success: 'תקין' };

const SystemControlTab = ({ data }) => {
    const [lastScan, setLastScan] = useState('היום, 08:30');
    const [severity, setSeverity] = useState('all');
    const [category, setCategory] = useState('all');
    const [drawerItem, setDrawerItem] = useState(null);

    const filteredChecks = useMemo(() => data.checks.filter((item) => {
        const matchesSeverity = severity === 'all' || item.severity === severity;
        const matchesCategory = category === 'all' || item.category === category;
        return matchesSeverity && matchesCategory;
    }), [data.checks, severity, category]);

    const categories = ['all', ...new Set(data.checks.map((item) => item.category))];
    const critical = data.checks.filter((item) => item.severity === 'critical').length;
    const warning = data.checks.filter((item) => item.severity === 'warning').length;
    const info = data.checks.filter((item) => item.severity === 'info').length;
    const success = data.checks.filter((item) => item.severity === 'success').length;

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="grid shrink-0 gap-3 md:grid-cols-5">
                <MetricCard title="זמן סריקה אחרונה" value={lastScan.split(',')[1]?.trim() || '08:30'} subtitle={lastScan.split(',')[0]} icon="shield" tone="primary" />
                <MetricCard title="תקלות קריטיות" value={critical} subtitle="דורש טיפול" icon="alertTriangle" tone="danger" />
                <MetricCard title="אזהרות" value={warning} subtitle="למעקב" icon="info" tone="warning" />
                <MetricCard title="בדיקות מידע" value={info} subtitle="מידע" icon="database" tone="primary" />
                <MetricCard title="בדיקות תקינות" value={success} subtitle="עבר" icon="check" tone="success" />
            </div>

            <SuperAdminCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-3">
                    <button type="button" onClick={() => setLastScan('היום, 08:31')} className="inquiry-control h-9 rounded-lg px-3 text-[12px] font-black"><Icon name="refresh" className="h-4 w-4" /> הרץ בדיקות</button>
                    <div className="flex flex-wrap gap-2">
                        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="inquiry-input-surface h-9 rounded-lg px-3 text-[12px] font-bold"><option value="all">כל החומרות</option><option value="critical">קריטי</option><option value="warning">אזהרה</option><option value="info">מידע</option><option value="success">תקין</option></select>
                        <select value={category} onChange={(event) => setCategory(event.target.value)} className="inquiry-input-surface h-9 rounded-lg px-3 text-[12px] font-bold">{categories.map((item) => <option key={item} value={item}>{item === 'all' ? 'כל הקטגוריות' : item}</option>)}</select>
                    </div>
                </div>
                <div className="min-h-0 flex-1 p-3">
                    <div className="overflow-hidden rounded-xl border border-[var(--color-border-strong)]">
                        {filteredChecks.slice(0, 7).map((item) => (
                            <button key={item.id} type="button" onClick={() => setDrawerItem(item)} className="grid w-full grid-cols-[94px_minmax(0,1.2fr)_minmax(0,1fr)_120px] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-right text-[12px] font-bold last:border-b-0 hover:bg-[var(--color-surface-muted)]">
                                <StatusBadge severity={item.severity}>{severityLabel[item.severity]}</StatusBadge>
                                <span className="truncate text-[13px] font-black text-[var(--color-text-primary)]">{item.title}</span>
                                <span className="truncate text-[var(--color-text-secondary)]">{item.entity}</span>
                                <span className="text-[var(--color-text-muted)]">{item.detectedAt}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </SuperAdminCard>

            <Drawer title={drawerItem?.title || 'ממצא'} item={drawerItem} onClose={() => setDrawerItem(null)}>
                <div className="space-y-3 text-[13px] font-semibold leading-6 text-[var(--color-text-secondary)]">
                    <StatusBadge severity={drawerItem?.severity}>{severityLabel[drawerItem?.severity]}</StatusBadge>
                    <p>{drawerItem?.explanation}</p>
                    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><b>ישות מושפעת:</b> {drawerItem?.entity}</div>
                    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><b>ערך צפוי:</b> שיוך מנהל/מטפל תקין</div>
                    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><b>ערך מזוהה:</b> {drawerItem?.title}</div>
                    <button type="button" className="h-9 rounded-lg bg-[var(--color-primary)] px-4 text-[12px] font-black text-white">{drawerItem?.action}</button>
                </div>
            </Drawer>
        </div>
    );
};

export default SystemControlTab;
