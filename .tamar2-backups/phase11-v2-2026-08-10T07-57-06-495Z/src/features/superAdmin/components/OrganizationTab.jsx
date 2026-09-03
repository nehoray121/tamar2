import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { CreateItemFormPanel } from '../../../pages/HierarchyPage/CreateItemModal.jsx';
import { organizationHierarchyApi } from '../../rooms/services/organizationHierarchyApi.js';
import { Drawer, MetricCard, StatusBadge, SuperAdminCard } from './SuperAdminPrimitives.jsx';

const COPY = {
    environment: 'סביבה',
    subEnvironment: 'תת-סביבה',
    room: 'חדר',
    wholeSystem: 'כל המערכת',
    systemTree: 'עץ המערכת',
    search: 'חיפוש בעץ...',
    noEntities: 'לא נמצאו ישויות התואמות לסינון או לחיפוש.',
    active: 'פעילה',
    inactive: 'מושהית',
    assignedUsers: 'משתמשים משויכים',
    activeTickets: 'פניות פעילות',
    operationalStatus: 'סטטוס תפעולי',
    currentScope: 'בטווח הנוכחי',
    fromBackend: 'מנתוני השרת',
    entityDetails: 'פרטי הישות',
    description: 'תיאור',
    noDescription: 'לא הוזן תיאור.',
    parent: 'הורה ארגוני',
    managementActions: 'פעולות ניהול',
    noSupportedActions: 'אין פעולות נוספות הנתמכות בישות זו.',
    createSub: 'יצירת תת-סביבה',
    createRoom: 'יצירת חדר',
    createSubTitle: 'יצירת תת-סביבה חדשה',
    createRoomTitle: 'יצירת חדר חדש',
    savedOnServer: 'הפריט יישמר בשרת לאחר אימות הרשאה.',
    noEnvironment: 'לא נבחרה סביבה.',
    noSubEnvironment: 'לא נבחרה תת-סביבה.',
    noEntity: 'אין ישות להצגה בטווח הארגוני שנבחר.'
};

const TYPE_LABELS = { environment: COPY.environment, sub: COPY.subEnvironment, room: COPY.room };
const TYPE_STYLES = {
    environment: 'border-blue-400/30 bg-blue-500/10 text-blue-600 dark:text-blue-200',
    sub: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    room: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
};

const normalizeEntity = (item, kind) => ({
    ...item,
    kind,
    envId: item.environmentId || item.envId,
    status: item.isActive === false ? COPY.inactive : COPY.active
});

const OrganizationTab = ({ data, onRefresh }) => {
    const [query, setQuery] = useState('');
    const [organization, setOrganization] = useState(data.organization);
    const [selectedId, setSelectedId] = useState(data.organization.selected?.id || null);
    const [drawerMode, setDrawerMode] = useState(null);

    useEffect(() => {
        setOrganization(data.organization);
        setSelectedId((current) => current || data.organization.selected?.id || null);
    }, [data.organization]);

    const entities = useMemo(() => [
        ...(organization.environments || []).map((item) => normalizeEntity(item, 'environment')),
        ...(organization.subEnvironments || []).map((item) => normalizeEntity(item, 'sub')),
        ...(organization.rooms || []).map((item) => normalizeEntity(item, 'room'))
    ], [organization]);
    const environmentMap = useMemo(() => new Map(entities.filter((item) => item.kind === 'environment').map((item) => [item.id, item])), [entities]);
    const subEnvironmentMap = useMemo(() => new Map(entities.filter((item) => item.kind === 'sub').map((item) => [item.id, item])), [entities]);
    const visible = useMemo(() => {
        const term = query.trim();
        return term ? entities.filter((item) => [item.name, item.description, TYPE_LABELS[item.kind]].join(' ').includes(term)) : entities;
    }, [entities, query]);

    useEffect(() => {
        if (!visible.length) return setSelectedId(null);
        if (!visible.some((item) => item.id === selectedId)) setSelectedId(visible[0].id);
    }, [selectedId, visible]);

    const current = entities.find((item) => item.id === selectedId) || visible[0] || null;
    const environmentId = current?.kind === 'environment' ? current.id : current?.environmentId || current?.envId;
    const subEnvironment = current?.kind === 'sub' ? current : subEnvironmentMap.get(current?.subEnvironmentId);
    const parentName = current?.kind === 'environment'
        ? COPY.wholeSystem
        : current?.kind === 'sub'
            ? environmentMap.get(environmentId)?.name || COPY.environment
            : subEnvironment?.name || COPY.subEnvironment;
    const actions = current?.kind === 'environment'
        ? [{ id: 'sub', label: COPY.createSub }]
        : current?.kind === 'sub' ? [{ id: 'room', label: COPY.createRoom }] : [];

    const createSubEnvironment = async ({ name, description }) => {
        if (!environmentId) throw new Error(COPY.noEnvironment);
        const response = await organizationHierarchyApi.createSubEnvironment({ environmentId, input: { name, description } });
        const created = normalizeEntity(response.data, 'sub');
        setOrganization((state) => ({ ...state, subEnvironments: [...(state.subEnvironments || []), created] }));
        setSelectedId(created.id);
        setDrawerMode(null);
        onRefresh?.();
        return created;
    };

    const createRoom = async ({ name, description, subEnvironmentId }) => {
        const targetId = subEnvironmentId || subEnvironment?.id;
        if (!targetId) throw new Error(COPY.noSubEnvironment);
        const response = await organizationHierarchyApi.createRoom({ subEnvironmentId: targetId, input: { name, description } });
        const created = normalizeEntity(response.data, 'room');
        setOrganization((state) => ({ ...state, rooms: [...(state.rooms || []), created] }));
        setSelectedId(created.id);
        setDrawerMode(null);
        onRefresh?.();
        return created;
    };

    return (
        <div className="grid h-full min-h-0 gap-3 overflow-hidden xl:grid-cols-[340px_minmax(0,1fr)]" dir="rtl">
            <SuperAdminCard className="flex min-h-0 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-[var(--color-border)] p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[15px] font-black text-[var(--color-text-primary)]">{COPY.systemTree}</h3>
                        <Icon name="building" className="h-4 w-4 text-[var(--color-primary)]" />
                    </div>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="inquiry-input-surface h-9 w-full rounded-lg px-3 text-[12px] font-bold outline-none" placeholder={COPY.search} />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    <div className="space-y-2">
                        {visible.map((item, index) => (
                            <button key={`${item.kind}-${item.id}`} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border px-3 py-2.5 text-right transition ${current?.id === item.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/50'}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="mb-1 flex items-center gap-1.5"><span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${TYPE_STYLES[item.kind]}`}>{TYPE_LABELS[item.kind]}</span><span className="truncate text-[13px] font-black text-[var(--color-text-primary)]">{item.name}</span></div>
                                        <div className="text-[11px] font-bold text-[var(--color-text-muted)]">{item.status}</div>
                                    </div>
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[11px] font-black text-[var(--color-text-muted)]">{index + 1}</span>
                                </div>
                            </button>
                        ))}
                        {!visible.length && <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] px-4 py-6 text-center text-[12px] font-bold text-[var(--color-text-muted)]">{COPY.noEntities}</div>}
                    </div>
                </div>
            </SuperAdminCard>

            <SuperAdminCard className="flex min-h-0 flex-col p-4">
                {current ? <>
                    <div className="mb-4 shrink-0">
                        <StatusBadge severity={current.isActive === false ? 'warning' : 'success'}>{current.status}</StatusBadge>
                        <div className="mt-2 flex items-center gap-2"><h2 className="text-[24px] font-black text-[var(--color-text-primary)]">{current.name}</h2><span className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${TYPE_STYLES[current.kind]}`}>{TYPE_LABELS[current.kind]}</span></div>
                    </div>
                    <div className="grid shrink-0 gap-3 md:grid-cols-3">
                        <MetricCard title={COPY.assignedUsers} value={data.users.rows.length} subtitle={COPY.currentScope} icon="users" tone="primary" />
                        <MetricCard title={COPY.activeTickets} value={data.overview.kpis[0]?.value || 0} subtitle={COPY.fromBackend} icon="layers" tone="neutral" />
                        <MetricCard title={COPY.operationalStatus} value={current.status} subtitle={COPY.fromBackend} icon="shield" tone={current.isActive === false ? 'warning' : 'success'} />
                    </div>
                    <div className="mt-4 grid min-h-0 flex-1 gap-3 xl:grid-cols-2">
                        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"><h3 className="text-[15px] font-black text-[var(--color-text-primary)]">{COPY.entityDetails}</h3><dl className="mt-3 space-y-2 text-[12px]"><div className="rounded-lg bg-[var(--color-surface-raised)] px-3 py-2"><dt className="font-black text-[var(--color-text-muted)]">{COPY.description}</dt><dd className="mt-1 font-bold text-[var(--color-text-primary)]">{current.description || COPY.noDescription}</dd></div><div className="rounded-lg bg-[var(--color-surface-raised)] px-3 py-2"><dt className="font-black text-[var(--color-text-muted)]">{COPY.parent}</dt><dd className="mt-1 font-bold text-[var(--color-text-primary)]">{parentName}</dd></div></dl></section>
                        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"><h3 className="text-[15px] font-black text-[var(--color-text-primary)]">{COPY.managementActions}</h3><div className="mt-3 grid gap-2">{actions.map((action) => <button key={action.id} type="button" onClick={() => setDrawerMode(action.id)} className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-[12px] font-black text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]">{action.label}</button>)}{!actions.length && <p className="text-[12px] font-bold text-[var(--color-text-muted)]">{COPY.noSupportedActions}</p>}</div></section>
                    </div>
                </> : <div className="flex flex-1 items-center justify-center text-[13px] font-bold text-[var(--color-text-muted)]">{COPY.noEntity}</div>}
            </SuperAdminCard>

            <Drawer title={drawerMode === 'sub' ? COPY.createSubTitle : COPY.createRoomTitle} subtitle={COPY.savedOnServer} item={drawerMode ? { mode: drawerMode } : null} onClose={() => setDrawerMode(null)} widthClassName="max-w-[720px]">
                {drawerMode === 'sub' && <CreateItemFormPanel type="sub_env" onCancel={() => setDrawerMode(null)} onCreateSubEnvironment={createSubEnvironment} onCreateRoom={createRoom} onSuccess={() => setDrawerMode(null)} />}
                {drawerMode === 'room' && <CreateItemFormPanel type="room" currentSubEnvironment={subEnvironment} onCancel={() => setDrawerMode(null)} onCreateSubEnvironment={createSubEnvironment} onCreateRoom={createRoom} onSuccess={() => setDrawerMode(null)} />}
            </Drawer>
        </div>
    );
};

export default OrganizationTab;