import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { accessRequestsApi } from '../../features/accessRequests/api/accessRequestsApi.js';
import { ROLE_KEYS, roleLabels } from '../../features/users/constants/userRoles.js';
import { subscribeAccessRequestRealtime } from '../../features/tickets/boards/realtime/boardSocket.js';
import { useSessionStore } from '../../store/session.store.js';

const statusLabels = Object.freeze({
    PENDING: 'ממתינה לאישור',
    APPROVED: 'אושרה',
    APPROVED_WITH_CHANGES: 'אושרה בשינויים',
    REJECTED: 'נדחתה',
    CANCELLED: 'בוטלה'
});
const requestableRoles = [ROLE_KEYS.ROOM_USER, ROLE_KEYS.ROOM_MANAGER, ROLE_KEYS.SYSTEM_ADMIN];
const emptyOptions = Object.freeze({ systems: [], environments: [], subEnvironments: [], rooms: [] });
const selectClass = 'inquiry-input-surface h-11 w-full rounded-xl px-3 text-sm font-bold';

const RequestState = ({ status }) => (
    <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${
        status === 'PENDING'
            ? 'border border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            : status.startsWith('APPROVED')
                ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border border-slate-400/25 bg-slate-500/10 text-[var(--color-text-secondary)]'
    }`}>{statusLabels[status] || status}</span>
);

const RequestSummary = ({ request }) => (
    <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-[var(--color-text-primary)]">{roleLabels[request.requestedRole] || request.requestedRole}</strong>
            <RequestState status={request.status} />
        </div>
        <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
            {request.requester?.displayName ? `${request.requester.displayName} · ` : ''}
            נוצרה ב־{new Date(request.createdAt).toLocaleString('he-IL')}
        </p>
        {request.reason && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{request.reason}</p>}
    </div>
);

const AccessRequestsPage = () => {
    const memberships = useSessionStore((state) => state.memberships);
    const capabilities = useSessionStore((state) => state.capabilities);
    const initializeRuntimeContext = useSessionStore((state) => state.initializeRuntimeContext);
    const [options, setOptions] = useState(emptyOptions);
    const [mine, setMine] = useState([]);
    const [reviewable, setReviewable] = useState([]);
    const [role, setRole] = useState(ROLE_KEYS.ROOM_USER);
    const [selection, setSelection] = useState({ systemId: '', environmentId: '', subEnvironmentId: '', roomId: '' });
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadLists = useCallback(async (signal) => {
        const [myResponse, reviewResponse] = await Promise.all([
            accessRequestsApi.listMine({ signal }),
            capabilities.reviewAccessRequests
                ? accessRequestsApi.listReviewable({ status: 'PENDING', page: 1, limit: 50 }, { signal })
                : Promise.resolve({ data: { items: [] } })
        ]);
        setMine(myResponse.data || []);
        setReviewable(reviewResponse.data?.items || []);
    }, [capabilities.reviewAccessRequests]);

    useEffect(() => subscribeAccessRequestRealtime({
        onInvalidate: () => loadLists(),
        onPermissionsUpdated: () => initializeRuntimeContext({ force: true, preserveAuthenticatedView: true })
    }), [initializeRuntimeContext, loadLists]);
    const loadInitialOptions = useCallback(async (signal) => {
        const root = (await accessRequestsApi.options({}, { signal })).data || emptyOptions;
        const systemId = root.systems?.[0]?.id || '';
        let environmentResult = emptyOptions;
        if (systemId) environmentResult = (await accessRequestsApi.options({ systemId }, { signal })).data || emptyOptions;
        const environmentId = environmentResult.environments?.[0]?.id || '';
        let subEnvironmentResult = emptyOptions;
        if (environmentId) subEnvironmentResult = (await accessRequestsApi.options({ systemId, environmentId }, { signal })).data || emptyOptions;
        const subEnvironmentId = subEnvironmentResult.subEnvironments?.[0]?.id || '';
        let roomResult = emptyOptions;
        if (subEnvironmentId) roomResult = (await accessRequestsApi.options({ systemId, environmentId, subEnvironmentId }, { signal })).data || emptyOptions;
        setOptions({
            systems: root.systems || [],
            environments: environmentResult.environments || [],
            subEnvironments: subEnvironmentResult.subEnvironments || [],
            rooms: roomResult.rooms || []
        });
        setSelection({ systemId, environmentId, subEnvironmentId, roomId: roomResult.rooms?.[0]?.id || '' });
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setStatus('loading');
        Promise.all([loadInitialOptions(controller.signal), loadLists(controller.signal)])
            .then(() => setStatus('ready'))
            .catch((loadError) => {
                if (loadError?.name === 'AbortError') return;
                setError(loadError?.message || 'לא ניתן לטעון את בקשות הגישה.');
                setStatus('error');
            });
        return () => controller.abort();
    }, [loadInitialOptions, loadLists]);

    const selectSystem = async (systemId) => {
        setError('');
        try {
            const environments = (await accessRequestsApi.options({ systemId })).data?.environments || [];
            const environmentId = environments[0]?.id || '';
            const subEnvironments = environmentId
                ? (await accessRequestsApi.options({ systemId, environmentId })).data?.subEnvironments || []
                : [];
            const subEnvironmentId = subEnvironments[0]?.id || '';
            const rooms = subEnvironmentId
                ? (await accessRequestsApi.options({ systemId, environmentId, subEnvironmentId })).data?.rooms || []
                : [];
            setOptions((current) => ({ ...current, environments, subEnvironments, rooms }));
            setSelection({ systemId, environmentId, subEnvironmentId, roomId: rooms[0]?.id || '' });
        } catch (selectionError) {
            setError(selectionError?.message || 'לא ניתן לטעון את המבנה הארגוני.');
        }
    };

    const selectEnvironment = async (environmentId) => {
        const { systemId } = selection;
        setError('');
        try {
            const subEnvironments = (await accessRequestsApi.options({ systemId, environmentId })).data?.subEnvironments || [];
            const subEnvironmentId = subEnvironments[0]?.id || '';
            const rooms = subEnvironmentId
                ? (await accessRequestsApi.options({ systemId, environmentId, subEnvironmentId })).data?.rooms || []
                : [];
            setOptions((current) => ({ ...current, subEnvironments, rooms }));
            setSelection({ systemId, environmentId, subEnvironmentId, roomId: rooms[0]?.id || '' });
        } catch (selectionError) {
            setError(selectionError?.message || 'לא ניתן לטעון את תתי־הסביבות.');
        }
    };

    const selectSubEnvironment = async (subEnvironmentId) => {
        const { systemId, environmentId } = selection;
        setError('');
        try {
            const rooms = (await accessRequestsApi.options({ systemId, environmentId, subEnvironmentId })).data?.rooms || [];
            setOptions((current) => ({ ...current, rooms }));
            setSelection((current) => ({ ...current, subEnvironmentId, roomId: rooms[0]?.id || '' }));
        } catch (selectionError) {
            setError(selectionError?.message || 'לא ניתן לטעון את החדרים.');
        }
    };

    const selectedScope = useMemo(() => {
        if (role === ROLE_KEYS.SYSTEM_ADMIN) {
            return { requestedScopeType: 'SUB_ENVIRONMENT', requestedScopeId: selection.subEnvironmentId, roomId: undefined };
        }
        return { requestedScopeType: 'ROOM', requestedScopeId: selection.roomId, roomId: selection.roomId };
    }, [role, selection]);

    const submitRequest = async (event) => {
        event.preventDefault();
        if (!selectedScope.requestedScopeId) {
            setError('יש לבחור תחום ארגוני תקין.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await accessRequestsApi.create({
                requestType: memberships.length ? 'ADDITIONAL_ACCESS' : 'INITIAL_ACCESS',
                requestedRole: role,
                requestedScopeType: selectedScope.requestedScopeType,
                requestedScopeId: selectedScope.requestedScopeId,
                systemId: selection.systemId,
                environmentId: selection.environmentId,
                subEnvironmentId: selection.subEnvironmentId,
                roomId: selectedScope.roomId,
                reason: reason.trim() || undefined
            });
            setReason('');
            await loadLists();
            await initializeRuntimeContext({ force: true, preserveAuthenticatedView: true });
        } catch (submitError) {
            setError(submitError?.message || 'לא ניתן לשלוח את בקשת הגישה.');
        } finally {
            setSubmitting(false);
        }
    };

    const decide = async (request, action) => {
        setSubmitting(true);
        setError('');
        try {
            if (action === 'approve') {
                await accessRequestsApi.approve(request.id, {
                    approvedRole: request.requestedRole,
                    approvedScopeType: request.requestedScopeType,
                    approvedScopeId: request.requestedScopeId,
                    systemId: request.systemId,
                    environmentId: request.environmentId,
                    subEnvironmentId: request.subEnvironmentId,
                    roomId: request.roomId || undefined,
                    reviewComment: ''
                });
            } else {
                await accessRequestsApi.reject(request.id, '');
            }
            await loadLists();
        } catch (decisionError) {
            setError(decisionError?.message || 'לא ניתן לעדכן את הבקשה.');
        } finally {
            setSubmitting(false);
        }
    };

    if (status === 'loading') {
        return <div className="inquiry-page-surface flex h-full items-center justify-center font-bold text-[var(--color-text-secondary)]" dir="rtl">טוען בקשות גישה…</div>;
    }

    return (
        <div className="inquiry-page-surface h-full overflow-y-auto p-5" dir="rtl">
            <div className="mx-auto max-w-5xl space-y-4">
                <header>
                    <h1 className="text-2xl font-black text-[var(--color-text-primary)]">בקשות גישה</h1>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">הבקשות, התפקידים והתחומים נטענים ממערכת ההרשאות הארגונית.</p>
                </header>

                {error && <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-300">{error}</div>}

                <section className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-card)]">
                    <h2 className="mb-3 text-lg font-black text-[var(--color-text-primary)]">בקשת הרשאה חדשה</h2>
                    <form onSubmit={submitRequest} className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <label className="text-xs font-black text-[var(--color-text-secondary)]">תפקיד
                                <select value={role} onChange={(event) => setRole(event.target.value)} className={`${selectClass} mt-1`}>
                                    {requestableRoles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
                                </select>
                            </label>
                            <label className="text-xs font-black text-[var(--color-text-secondary)]">מערכת
                                <select value={selection.systemId} onChange={(event) => selectSystem(event.target.value)} className={`${selectClass} mt-1`}>
                                    {options.systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                            <label className="text-xs font-black text-[var(--color-text-secondary)]">סביבה
                                <select value={selection.environmentId} onChange={(event) => selectEnvironment(event.target.value)} className={`${selectClass} mt-1`}>
                                    {options.environments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                            <label className="text-xs font-black text-[var(--color-text-secondary)]">תת־סביבה
                                <select value={selection.subEnvironmentId} onChange={(event) => selectSubEnvironment(event.target.value)} className={`${selectClass} mt-1`}>
                                    {options.subEnvironments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                            {role !== ROLE_KEYS.SYSTEM_ADMIN && (
                                <label className="text-xs font-black text-[var(--color-text-secondary)]">חדר
                                    <select value={selection.roomId} onChange={(event) => setSelection((current) => ({ ...current, roomId: event.target.value }))} className={`${selectClass} mt-1`}>
                                        {options.rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </select>
                                </label>
                            )}
                        </div>
                        <label className="block text-xs font-black text-[var(--color-text-secondary)]">סיבת הבקשה (אופציונלי)
                            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} className="inquiry-input-surface mt-1 min-h-20 w-full rounded-xl p-3 text-sm font-semibold" />
                        </label>
                        <button type="submit" disabled={submitting || !selectedScope.requestedScopeId} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-black text-white disabled:opacity-50">
                            <Icon name="send" className="h-4 w-4" />שליחת בקשה
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-card)]">
                    <h2 className="mb-3 text-lg font-black text-[var(--color-text-primary)]">הבקשות שלי</h2>
                    {!mine.length && <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm font-semibold text-[var(--color-text-secondary)]">טרם נשלחו בקשות גישה.</p>}
                    <div className="space-y-2">
                        {mine.map((request) => (
                            <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3">
                                <RequestSummary request={request} />
                                {request.status === 'PENDING' && (
                                    <button type="button" disabled={submitting} onClick={async () => { await accessRequestsApi.cancel(request.id); await loadLists(); }} className="rounded-lg border border-red-400/25 px-3 py-2 text-xs font-black text-red-600 dark:text-red-300">ביטול בקשה</button>
                                )}
                            </article>
                        ))}
                    </div>
                </section>

                {capabilities.reviewAccessRequests && (
                    <section className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-card)]">
                        <h2 className="mb-3 text-lg font-black text-[var(--color-text-primary)]">בקשות הממתינות לבדיקתי</h2>
                        {!reviewable.length && <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm font-semibold text-[var(--color-text-secondary)]">אין בקשות הממתינות לאישור בתחום הרשאתך.</p>}
                        <div className="space-y-2">
                            {reviewable.map((request) => (
                                <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3">
                                    <RequestSummary request={request} />
                                    <div className="flex gap-2">
                                        <button type="button" disabled={submitting} onClick={() => decide(request, 'reject')} className="rounded-lg border border-red-400/25 px-3 py-2 text-xs font-black text-red-600 dark:text-red-300">דחייה</button>
                                        <button type="button" disabled={submitting} onClick={() => decide(request, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">אישור</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default AccessRequestsPage;
