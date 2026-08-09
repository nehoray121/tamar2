import React, { useMemo, useState } from 'react';
import { BarList, MetricCard, SuperAdminCard } from './SuperAdminPrimitives.jsx';

const subTabs = [
    { id: 'workload', label: 'עומסים' },
    { id: 'sla', label: 'זמני טיפול ו-SLA' },
    { id: 'assignments', label: 'שיוכים' },
    { id: 'categories', label: 'קטגוריות' }
];

const loadLevelConfig = {
    environment: {
        title: 'עומס לפי סביבה',
        description: 'השוואת פניות פתוחות כוללת בין הסביבות',
   dotClass: 'bg-orange-500',
fillClass: 'bg-[linear-gradient(270deg,#F97316_0%,#FB923C_100%)] dark:bg-[linear-gradient(270deg,#C2410C_0%,#F97316_100%)]',
countLabel: 'סביבות'
    },
    subEnvironment: {
        title: 'עומס לפי תת-סביבה',
        description: 'חלוקת העומס בין כלל תתי-הסביבות',
        dotClass: 'bg-indigo-500',
        fillClass: 'bg-[linear-gradient(90deg,#4F46E5_0%,#6366F1_100%)] dark:bg-[linear-gradient(90deg,#4338CA_0%,#6366F1_100%)]',
        countLabel: 'תתי-סביבות'
    },
    room: {
        title: 'עומס לפי חדר',
        description: 'עומס נוכחי מפורט לפי כל החדרים במערכת',
        dotClass: 'bg-teal-500',
        fillClass: 'bg-[linear-gradient(90deg,#14B8A6_0%,#22C55E_100%)] dark:bg-[linear-gradient(90deg,#0F766E_0%,#14B8A6_100%)]',
        countLabel: 'חדרים'
    }
};

const formatCountLabel = (count, noun) => `${count} ${noun}`;

const LoadBarRow = ({ item, maxValue, fillClass }) => {
    const numericValue = Number(item.value) || 0;

    const width = maxValue > 0
        ? Math.min(100, Math.max(0, (numericValue / maxValue) * 100))
        : 0;

    return (
        <div className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_56px] items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
            <div className="min-w-0 text-right">
                <div className="truncate text-[13px] font-black text-[var(--color-text-primary)]">
                    {item.name || item.label}
                </div>

                {item.contextName && (
                    <div className="mt-0.5 truncate text-[11px] font-bold text-[var(--color-text-muted)]">
                        {item.contextName}
                    </div>
                )}
            </div>

         <div className="
    relative h-6 overflow-hidden rounded-xl
    border border-slate-300
    bg-slate-200
    shadow-[inset_0_1px_3px_rgba(15,23,42,0.16)]
    dark:border-slate-600
    dark:bg-slate-700
    dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.35)]
">
    <div
        className={`absolute inset-y-0 right-0 rounded-xl transition-[width] duration-300 ${fillClass}`}
        style={{
            width: `${width}%`
        }}
    />
</div>

            <div className="text-left text-[14px] font-black text-[var(--color-text-primary)]">
                {numericValue}
            </div>
        </div>
    );
};
const WorkloadCard = ({ level, items }) => {
    const config = loadLevelConfig[level];
    const maxValue = items.length ? Math.max(...items.map((item) => Number(item.value) || 0)) : 0;
    const bodyClassName = items.length > 6 ? 'max-h-[460px] overflow-y-auto pr-1 custom-scrollbar' : 'overflow-visible';

    return (
        <SuperAdminCard className="flex min-h-0 flex-col overflow-hidden">
            <div className="border-b border-[var(--color-border)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[18px] font-black text-[var(--color-text-primary)]">
                            <span className={`h-3 w-3 rounded-full ${config.dotClass}`} />
                            <span>{config.title}</span>
                        </div>
                        <p className="mt-1 text-[12px] font-bold text-[var(--color-text-muted)]">{config.description}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-[11px] font-black text-[var(--color-text-secondary)]">
                        {formatCountLabel(items.length, config.countLabel)}
                    </span>
                </div>
            </div>

            <div className={`px-4 py-4 ${bodyClassName}`}>
                {items.length ? (
                    <div className="space-y-3">
                        {items.map((item) => <LoadBarRow key={item.id || item.label} item={item} maxValue={maxValue} fillClass={config.fillClass} />)}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 py-8 text-center text-[12px] font-bold text-[var(--color-text-muted)]">
                        אין נתוני עומס להצגה בטווח שנבחר.
                    </div>
                )}
            </div>
        </SuperAdminCard>
    );
};

const WorkloadSection = ({ performance, scope }) => {
    const cards = useMemo(() => {
        if (scope?.roomId) {
            return [{ level: 'room', items: performance.roomLoad.filter((item) => item.id === scope.roomId) }];
        }

        if (scope?.subEnvironmentId) {
            return [{ level: 'room', items: performance.roomLoad }];
        }

        if (scope?.environmentId) {
            return [
                { level: 'subEnvironment', items: performance.subEnvironmentLoad },
                { level: 'room', items: performance.roomLoad }
            ];
        }

        return [
            { level: 'environment', items: performance.environmentLoad },
            { level: 'subEnvironment', items: performance.subEnvironmentLoad },
            { level: 'room', items: performance.roomLoad }
        ];
    }, [performance, scope]);

    const gridClassName = cards.length === 1
        ? 'grid-cols-1 max-w-5xl'
        : cards.length === 2
            ? 'grid-cols-1 xl:grid-cols-2'
            : 'grid-cols-1 2xl:grid-cols-3 xl:grid-cols-2';

    return (
        <div className={`grid min-h-0 flex-1 items-start gap-3 ${gridClassName}`}>
            {cards.map((card) => <WorkloadCard key={card.level} level={card.level} items={card.items} />)}
        </div>
    );
};

const PerformanceTab = ({ data }) => {
    const [subTab, setSubTab] = useState('workload');
    const { performance, organization } = data;

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="flex shrink-0 justify-end">
                <div className="flex rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-1">
                    {subTabs.map((tab) => (
                        <button key={tab.id} type="button" onClick={() => setSubTab(tab.id)} className={`rounded-lg px-3 py-1.5 text-[12px] font-black transition ${subTab === tab.id ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]'}`}>{tab.label}</button>
                    ))}
                </div>
            </div>

            {subTab === 'workload' && <WorkloadSection performance={performance} scope={organization?.scope} />}

            {subTab === 'sla' && (
                <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
                    {performance.response.map((item) => <MetricCard key={item.label} title={item.label} value={item.label.includes('SLA') ? `${item.value}%` : item.label.includes('תגובה') ? `${item.value} דק׳` : `${item.value} ש׳`} subtitle="ממוצע בטווח הנוכחי" icon="clock" tone={item.value > 70 ? 'success' : 'warning'} />)}
                    <SuperAdminCard className="col-span-full p-4">
                        <h3 className="mb-3 text-[15px] font-black text-[var(--color-text-primary)]">פתוחות מול סגורות</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {performance.openVsClosed.map((item) => <div key={item.label} className="rounded-xl bg-[var(--color-surface-muted)] p-4"><div className="text-[12px] font-bold text-[var(--color-text-muted)]">{item.label}</div><div className="mt-1 text-[28px] font-black text-[var(--color-primary)]">{item.value}</div></div>)}
                        </div>
                    </SuperAdminCard>
                </div>
            )}

            {subTab === 'assignments' && (
                <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <BarList title="שיוכים אוטומטיים מול ידניים" subtitle="התפלגות פעולות שיוך" items={performance.assignment} />
                    <MetricCard title="כשלי שיוך" value={performance.assignmentFailures} subtitle="נדרשת בדיקה בחדרים ללא מטפלים" icon="alertTriangle" tone="danger" />
                </div>
            )}

            {subTab === 'categories' && (
                <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-2">
                    <BarList title="נפח לפי קטגוריה" subtitle="קטגוריות פנייה מובילות" items={performance.categories} accent="#10b981" />
                    <SuperAdminCard className="p-4">
                        <h3 className="text-[15px] font-black text-[var(--color-text-primary)]">קטגוריות בצמיחה</h3>
                        <div className="mt-3 grid gap-2">
                            {performance.categories.slice(0, 5).map((item, index) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] px-3 py-2 text-[12px] font-bold"><span>{item.label}</span><span className="text-[var(--color-success)]">+{index + 3}%</span></div>)}
                        </div>
                    </SuperAdminCard>
                </div>
            )}
        </div>
    );
};

export default PerformanceTab;
