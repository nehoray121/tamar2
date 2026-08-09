import React, { useEffect, useMemo, useState } from 'react';
import { CompactTable, Drawer, StatusBadge, SuperAdminCard } from './SuperAdminPrimitives.jsx';

const PAGE_SIZE = 5;

const resultSeverity = (result) => {
    if (result === 'נסגרה' || result === 'התקבלה') return 'success';
    if (result === 'נשלחה') return 'info';
    return 'warning';
};

const formatEventScope = (event) => {
    if (event.action === 'שליחת פנייה') return `${event.sourceRoomName || 'חדר מקור'} → ${event.targetRoomName || 'חדר יעד'}`;
    if (event.action === 'קבלת פנייה') return event.targetRoomName || event.roomName || 'חדר יעד';
    return event.roomName || event.scope || 'כל המערכת';
};

const ChangeLogTab = ({ data }) => {
    const [query, setQuery] = useState('');
    const [action, setAction] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [drawerItem, setDrawerItem] = useState(null);

    const actions = useMemo(() => ['all', ...new Set(data.auditEvents.map((item) => item.action))], [data.auditEvents]);
    const dateOptions = useMemo(() => ['all', ...new Set(data.auditEvents.map((item) => item.dateKey).filter(Boolean))], [data.auditEvents]);

    const filteredEvents = useMemo(() => data.auditEvents.filter((event) => {
        const normalizedQuery = query.trim();
        const matchesQuery = !normalizedQuery || [
            event.actor,
            event.entity,
            event.scope,
            event.details,
            event.inquiryId,
            event.roomName,
            event.sourceRoomName,
            event.targetRoomName
        ].filter(Boolean).some((value) => String(value).includes(normalizedQuery));
        const matchesAction = action === 'all' || event.action === action;
        const matchesDate = dateFilter === 'all' || event.dateKey === dateFilter;
        return matchesQuery && matchesAction && matchesDate;
    }), [data.auditEvents, query, action, dateFilter]);

    useEffect(() => {
        setPage(0);
    }, [query, action, dateFilter]);

    const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
    const rows = filteredEvents.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((event) => ({
        id: event.id,
        raw: event,
        cells: [event.date, event.actor, event.action, event.inquiryId, formatEventScope(event), event.result, event.details]
    }));

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <SuperAdminCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-3">
                    <h3 className="text-[15px] font-black text-[var(--color-text-primary)]">יומן שינויים</h3>
                    <div className="flex flex-wrap gap-2">
                        <input value={query} onChange={(event) => setQuery(event.target.value)} className="inquiry-input-surface h-9 w-56 rounded-lg px-3 text-[12px] font-bold" placeholder="חיפוש לפי משתמש, חדר או פנייה..." />
                        <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="inquiry-input-surface h-9 rounded-lg px-3 text-[12px] font-bold">
                            <option value="all">כל התאריכים</option>
                            {dateOptions.filter((item) => item !== 'all').map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={action} onChange={(event) => setAction(event.target.value)} className="inquiry-input-surface h-9 rounded-lg px-3 text-[12px] font-bold">
                            {actions.map((item) => <option key={item} value={item}>{item === 'all' ? 'כל הפעולות' : item}</option>)}
                        </select>
                    </div>
                </div>
                <div className="min-h-0 flex-1 p-3">
                    <CompactTable columns={['תאריך ושעה', 'משתמש מבצע', 'פעולה', 'פנייה', 'תחום ארגוני', 'תוצאה', 'פרטים']} rows={rows} onRowClick={(row) => setDrawerItem(row.raw)} emptyText="לא נמצאו אירועים בטווח שנבחר" />
                </div>
                <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] px-3 py-2 text-[12px] font-bold text-[var(--color-text-muted)]">
                    <span>עמוד {Math.min(page + 1, pageCount)} מתוך {pageCount}</span>
                    <div className="flex gap-2">
                        <button type="button" className="inquiry-control h-8 rounded-lg px-3" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>הקודם</button>
                        <button type="button" className="inquiry-control h-8 rounded-lg px-3" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>הבא</button>
                    </div>
                </div>
            </SuperAdminCard>

            <Drawer title={drawerItem?.action || 'אירוע'} subtitle="פרטי האירוע מוצגים לפי הנתונים הארגוניים והפנייה בפועל." item={drawerItem} onClose={() => setDrawerItem(null)}>
                <div className="space-y-3 text-[13px] font-semibold leading-6 text-[var(--color-text-secondary)]">
                    <StatusBadge severity={resultSeverity(drawerItem?.result)}>{drawerItem?.result}</StatusBadge>
                    <p><b>מבצע:</b> {drawerItem?.actor || 'לא זמין'}</p>
                    <p><b>תאריך ושעה:</b> {drawerItem?.date || 'לא זמין'}</p>
                    <p><b>פנייה:</b> {drawerItem?.inquiryId || 'לא זמין'}</p>
                    <p><b>חדר/תחום:</b> {formatEventScope(drawerItem || {})}</p>
                    {drawerItem?.sourceRoomName && <p><b>חדר מקור:</b> {drawerItem.sourceRoomName}</p>}
                    {drawerItem?.targetRoomName && <p><b>חדר יעד:</b> {drawerItem.targetRoomName}</p>}
                    {drawerItem?.closeRoomName && <p><b>נסגרה בחדר:</b> {drawerItem.closeRoomName}</p>}
                    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><b>תיאור האירוע:</b> {drawerItem?.details || 'אין פירוט נוסף'}</div>
                    {drawerItem?.closureSummary && <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><b>סיכום סגירה:</b> {drawerItem.closureSummary}</div>}
                </div>
            </Drawer>
        </div>
    );
};

export default ChangeLogTab;
