import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { useUserManagement } from '../../features/users/hooks/useUserManagement.js';
import { useUserManagementCapabilities } from '../../features/users/hooks/useUserManagementCapabilities.js';
import { ROLE_KEYS, roleLabels } from '../../features/users/constants/userRoles.js';

const SYSTEM_ROLE_GUIDE = [
    {
        id: ROLE_KEYS.SYSTEM_ADMIN,
        label: roleLabels[ROLE_KEYS.SYSTEM_ADMIN],
        summary: 'ניהול ממוקד של תת־סביבה אחת וכל החדרים המשויכים אליה.',
        scope: 'תת־סביבה אחת וכל החדרים שבתוכה.',
        capabilities: [
            'ניהול תת־הסביבה והחדרים השייכים אליה.',
            'צפייה וניהול של הפניות והפעילות בכל חדרי תת־הסביבה.',
            'שיוך משתמשים לחדרים וניהול הרשאות בתחום המותר.',
            'ניהול הגדרות ושדות מערכת של החדרים בהתאם לסמכותו.',
            'צפייה בעומסים, SLA ויומן השינויים של תת־הסביבה.'
        ]
    },
    {
        id: ROLE_KEYS.ROOM_MANAGER,
        label: roleLabels[ROLE_KEYS.ROOM_MANAGER],
        summary: 'ניהול תפעולי מלא של חדר אחד או כמה חדרים שהוקצו למנהל.',
        scope: 'חדר אחד או מספר חדרים שהוקצו לו.',
        capabilities: [
            'ניהול הפניות הפתוחות, הסגורות והחיצוניות של החדר.',
            'פתיחה, עריכה, סגירה, שליחה, קבלה והחזרה של פניות.',
            'שיוך פניות למשתמשים ושיוך קטגוריות.',
            'ניהול משתמשי החדר והשיוכים שלהם בהתאם להרשאה.',
            'צפייה בעומס, SLA, פעילות והיסטוריית השינויים של החדר.'
        ]
    },
    {
        id: ROLE_KEYS.ROOM_USER,
        label: roleLabels[ROLE_KEYS.ROOM_USER],
        summary: 'משתמש רגיל בחדר הפועל בתוך התחום שהוגדר לו ללא סמכויות ניהול מערכת.',
        scope: 'החדרים שאליהם המשתמש משויך.',
        capabilities: [
            'צפייה בפניות של החדר ובפרטי הפנייה.',
            'פתיחת פניות ועדכון פניות בהתאם לפעולות המותרות.',
            'צפייה בפניות שהוקצו אליו ובפניות שפתח במשימות שלי.',
            'סגירת פניות בחדר בהתאם לכללי המערכת.',
            'צפייה בהיסטוריה, בקטגוריות ובפניות החיצוניות בחדר.'
        ]
    }
];

const scopeLabel = (scope = {}) => scope.scopeLabel || 'לא הוגדר תחום';

const buildScope = (role, selection, options) => {
    const system = options.systems.find((item) => item.id === selection.systemId) || options.systems[0];
    const environment = options.environments.find((item) => item.id === selection.environmentId)
        || options.environments.find((item) => !system || item.systemId === system.id);
    const subEnvironment = options.subEnvironments.find((item) => item.id === selection.subEnvironmentId)
        || options.subEnvironments.find((item) => !environment || item.environmentId === environment.id);
    const room = options.rooms.find((item) => item.id === selection.roomId)
        || options.rooms.find((item) => !subEnvironment || item.subEnvironmentId === subEnvironment.id);
    if (role === ROLE_KEYS.SUPER_ADMIN && system) return { scopeType: 'SYSTEM', scopeId: system.id, systemId: system.id };
    if (role === ROLE_KEYS.SYSTEM_ADMIN && subEnvironment) {
        return { scopeType: 'SUB_ENVIRONMENT', scopeId: subEnvironment.id, systemId: subEnvironment.systemId, environmentId: subEnvironment.environmentId, subEnvironmentId: subEnvironment.id };
    }
    if ([ROLE_KEYS.ROOM_MANAGER, ROLE_KEYS.ROOM_USER].includes(role) && room) {
        return { scopeType: 'ROOM', scopeId: room.id, systemId: room.systemId, environmentId: room.environmentId, subEnvironmentId: room.subEnvironmentId, roomId: room.id };
    }
    return null;
};

const RoleScopeForm = ({ role, setRole, scope, setScope, roleOptions, organizationOptions, compact = false }) => {
    const system = organizationOptions.systems.find((item) => item.id === scope.systemId) || organizationOptions.systems[0];
    const environments = organizationOptions.environments.filter((item) => !system || item.systemId === system.id);
    const environment = environments.find((item) => item.id === scope.environmentId) || environments[0];
    const subEnvironments = organizationOptions.subEnvironments.filter((item) => !environment || item.environmentId === environment.id);
    const subEnvironment = subEnvironments.find((item) => item.id === scope.subEnvironmentId) || subEnvironments[0];
    const rooms = organizationOptions.rooms.filter((item) => !subEnvironment || item.subEnvironmentId === subEnvironment.id);
    const selectClass = compact
        ? 'inquiry-input-surface h-10 rounded-xl px-3 text-[12px] font-black'
        : 'h-8 rounded-lg border border-blue-100 px-2.5 text-[11px] font-black';

    return (
        <div className={`grid gap-2 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
            <select value={role} onChange={(event) => setRole(event.target.value)} className={selectClass}>
                {roleOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select value={scope.systemId || system?.id || ''} onChange={(event) => setScope({ systemId: event.target.value })} className={selectClass}>
                {organizationOptions.systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {role !== ROLE_KEYS.SUPER_ADMIN && (
                <select value={scope.environmentId || environment?.id || ''} onChange={(event) => setScope({ systemId: system?.id, environmentId: event.target.value })} className={selectClass}>
                    {environments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            )}
            {role !== ROLE_KEYS.SUPER_ADMIN && (
                <select value={scope.subEnvironmentId || subEnvironment?.id || ''} onChange={(event) => setScope({ ...scope, systemId: system?.id, environmentId: environment?.id, subEnvironmentId: event.target.value })} className={selectClass}>
                    {subEnvironments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            )}
            {[ROLE_KEYS.ROOM_MANAGER, ROLE_KEYS.ROOM_USER].includes(role) && (
                <select value={scope.roomId || rooms[0]?.id || ''} onChange={(event) => setScope({ ...scope, systemId: system?.id, environmentId: environment?.id, subEnvironmentId: subEnvironment?.id, roomId: event.target.value })} className={selectClass}>
                    {rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            )}
        </div>
    );
};
const PermissionsExplanationCard = ({ compact = false }) => {
    const [activeRoleIndex, setActiveRoleIndex] = useState(0);
    const roleRefs = useRef([]);
    const visibleRoles = useMemo(
        () => SYSTEM_ROLE_GUIDE,
        []
    );

    const sectionTitleClass = compact ? 'text-[11px] text-[var(--color-text-muted)]' : 'text-[11px] text-slate-500';
    const bodyTextClass = compact ? 'text-[12px] leading-5 text-[var(--color-text-secondary)]' : 'text-xs leading-[1.45rem] text-slate-600';

    useEffect(() => {
        const observers = roleRefs.current
            .filter(Boolean)
            .map((element, index) => {
                const observer = new IntersectionObserver(
                    (entries) => {
                        entries.forEach((entry) => {
                            if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
                                setActiveRoleIndex(index);
                            }
                        });
                    },
                    {
                        root: element.parentElement,
                        threshold: [0.65, 0.8]
                    }
                );
                observer.observe(element);
                return observer;
            });

        return () => {
            observers.forEach((observer) => observer.disconnect());
        };
    }, [visibleRoles]);

    return (
        <section className={compact
            ? 'rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4 shadow-none'
            : 'rounded-2xl border border-blue-100 bg-white p-4 shadow-sm'}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className={`${compact ? 'text-[16px] text-[var(--color-text-primary)]' : 'text-base text-slate-950'} font-black`}>הסבר הרשאות מערכת</h2>
                <div className="flex items-center gap-1.5">
                    {visibleRoles.map((role, index) => (
                        <span
                            key={role.id}
                            className={`h-2.5 rounded-full transition-all ${activeRoleIndex === index ? 'w-5 bg-[var(--color-primary)]' : 'w-2.5 bg-[var(--color-border-strong)]'}`}
                            aria-hidden="true"
                        />
                    ))}
                </div>
            </div>
            <div className="relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-[var(--color-surface-raised)] to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-7 bg-gradient-to-t from-[var(--color-surface-raised)] to-transparent" />
                <div
                    tabIndex={0}
                    aria-label="הסבר הרשאות מערכת לפי תפקידים"
                    className={`snap-y snap-mandatory overflow-y-auto scroll-smooth pl-1 pr-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${compact ? 'h-[300px]' : 'h-[320px]'}`}
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {visibleRoles.map((role, index) => (
                        <article
                            key={role.id}
                            ref={(element) => {
                                roleRefs.current[index] = element;
                            }}
                            className={`permission-role-slide snap-start snap-always border-b border-[var(--color-border)] py-3 last:border-b-0 ${compact ? 'h-[300px]' : 'h-[320px]'}`}
                        >
                            <header className="mb-2 flex items-center gap-3">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
                                <h3 className={`${compact ? 'text-[13px] text-[var(--color-text-primary)]' : 'text-sm text-slate-900'} font-black`}>{role.label}</h3>
                            </header>

                            <p className={`${bodyTextClass} mb-2 font-bold`}>{role.summary}</p>

                            <div className="mb-3 rounded-xl bg-[var(--color-surface-muted)]/35 px-3 py-2">
                                <span className={`${sectionTitleClass} block font-black`}>תחום הרשאה</span>
                                <span className={`${bodyTextClass} mt-1 block font-bold`}>{role.scope}</span>
                            </div>

                            <div>
                                <h4 className={`${sectionTitleClass} mb-1 font-black`}>מה ניתן לבצע</h4>
                                <ul className={`${bodyTextClass} list-disc space-y-1 pr-4 font-bold marker:text-[var(--color-primary)]`}>
                                    {role.capabilities.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};

export const CreateUserPanel = ({ initialId = '', onCancel, onCreated }) => {
    const api = useUserManagement();
    const capabilities = useUserManagementCapabilities(api.options.roles);
    const roleOptions = capabilities.allowedRoles;
    const [personalNumber, setPersonalNumber] = useState(initialId || '');
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [scope, setScope] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { setPersonalNumber(initialId || ''); }, [initialId]);
    useEffect(() => { if (!role && roleOptions[0]?.id) setRole(roleOptions[0].id); }, [role, roleOptions]);

    const handleCreate = async () => {
        const canonicalScope = buildScope(role, scope, api.options);
        if (!personalNumber.trim() || !displayName.trim() || !role || !canonicalScope) {
            setError('יש למלא שם, מספר אישי ותחום הרשאה תקין.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const user = await api.createUser({ personalNumber: personalNumber.trim(), displayName: displayName.trim(), email: email.trim() || undefined, role, scope: canonicalScope });
            onCreated?.(user);
        } catch (createError) {
            setError(createError?.message || 'לא ניתן ליצור את המשתמש.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-4 px-1 py-1">
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-xs font-black text-[var(--color-text-primary)]">שם מלא<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="inquiry-input-surface mt-1 h-11 w-full rounded-xl px-3 text-sm font-bold" /></label>
                    <label className="block text-xs font-black text-[var(--color-text-primary)]">מספר אישי<input value={personalNumber} onChange={(event) => setPersonalNumber(event.target.value)} className="inquiry-input-surface mt-1 h-11 w-full rounded-xl px-3 text-sm font-bold" /></label>
                </div>
                <label className="block text-xs font-black text-[var(--color-text-primary)]">דואר אלקטרוני (אופציונלי)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="inquiry-input-surface mt-1 h-11 w-full rounded-xl px-3 text-sm font-bold" /></label>
                <RoleScopeForm role={role} setRole={setRole} scope={scope} setScope={setScope} roleOptions={roleOptions} organizationOptions={api.options} compact />
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-1 pt-4">
                <button type="button" onClick={onCancel} className="inquiry-control inline-flex h-11 items-center justify-center rounded-xl px-5 text-[13px] font-black">ביטול</button>
                <button type="button" onClick={handleCreate} disabled={!personalNumber.trim() || !displayName.trim() || !role || submitting} className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'שומר...' : 'צור משתמש'}</button>
            </div>
        </div>
    );
};
const UserCard = ({ user, onOpen }) => (
    <article className="rounded-2xl border border-blue-100 bg-white p-3 text-center shadow-sm">
        <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500"><Icon name="user" className="h-5 w-5" /></span>
        <h3 className="text-base font-black text-slate-950">{user.name}</h3>
        <p className="text-xs font-bold text-slate-500">מזהה: {user.personalNumberMasked || user.id}</p>
        <div className="mt-2 flex justify-center gap-1.5">
            <span className={`rounded-lg px-2 py-1 text-xs font-black ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{user.status === 'active' ? 'פעיל' : 'מושבת'}</span>
            <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{roleLabels[user.primaryRole] || user.primaryScope?.roleLabel || 'ללא תפקיד'}</span>
        </div>
        <p className="mt-2 min-h-[24px] text-xs font-bold text-slate-500">{scopeLabel(user.primaryScope)}</p>
        <button onClick={() => onOpen(user.id)} className="mt-3 h-9 w-full rounded-lg bg-blue-600 px-3 text-xs font-black text-white">ניהול משתמש</button>
    </article>
);

export const UserDetailPanel = ({ user, api, roleOptions, onBack, compact = false }) => {
    const [role, setRole] = useState(user.primaryRole);
    const [scope, setScope] = useState(user.primaryScope || {});
    const [assignmentRole, setAssignmentRole] = useState(roleOptions[0]?.id || '');
    const [assignmentScope, setAssignmentScope] = useState({});

    useEffect(() => {
        setRole(user.primaryRole);
        setScope(user.primaryScope || {});
    }, [user]);

    const sectionClass = compact
        ? 'rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4 shadow-none'
        : 'rounded-2xl border border-blue-100 bg-white p-3 shadow-sm';

    return (
        <div className={`h-full overflow-y-auto ${compact ? '' : 'p-3'}`} dir="rtl">
            <div className={`mx-auto flex w-full flex-col gap-3 ${compact ? '' : 'max-w-[1160px]'}`}>
                {onBack && (
                    <button onClick={onBack} className={`${compact ? 'inquiry-control h-10 rounded-xl px-4 text-[12px] font-black text-[var(--color-text-secondary)]' : 'w-fit rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700'}`}>
                        חזרה לניהול משתמשים
                    </button>
                )}
                <section className={sectionClass}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500"><Icon name="user" className="h-5 w-5" /></span>
                            <div>
                                <h1 className={`${compact ? 'text-xl text-[var(--color-text-primary)]' : 'text-lg text-slate-950'} font-black`}>{user.name}</h1>
                                <p className={`${compact ? 'text-[12px] text-[var(--color-text-muted)]' : 'text-xs text-slate-500'} font-bold`}>מזהה: {user.personalNumberMasked || user.id}</p>
                                <p className={`${compact ? 'text-[12px] text-[var(--color-text-muted)]' : 'text-xs text-slate-500'} font-bold`}>{roleLabels[user.primaryRole] || user.primaryScope?.roleLabel || 'ללא תפקיד'} · {scopeLabel(user.primaryScope)}</p>
                            </div>
                        </div>
                        <button onClick={() => api.setUserActive(user.id, user.status !== 'active')} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black ${user.status === 'active' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                            {user.status === 'active' ? 'השבת משתמש' : 'הפעל משתמש'}
                        </button>
                    </div>
                </section>
                <div className={`grid gap-3 ${compact ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,2.2fr)_minmax(280px,0.95fr)] xl:items-start'}`}>
                    <div className="space-y-3">
                        <section className={sectionClass}>
                            <h2 className={`${compact ? 'text-[16px] text-[var(--color-text-primary)]' : 'text-base text-slate-950'} mb-2 font-black`}>עריכת דרגה ראשית</h2>
                            <RoleScopeForm role={role} setRole={setRole} scope={scope} setScope={setScope} roleOptions={roleOptions} organizationOptions={api.options} compact={compact} />
                            <button onClick={() => api.updatePrimary(user.id, { role, scope: buildScope(role, scope, api.options) })} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-black text-white">שמור דרגה ראשית</button>
                        </section>
                        <section className={sectionClass}>
                            <h2 className={`${compact ? 'text-[16px] text-[var(--color-text-primary)]' : 'text-base text-slate-950'} mb-2 font-black`}>שיוכים ניהוליים נוספים</h2>
                            <div className="mb-3 space-y-2">
                                {user.assignments.map((assignment) => (
                                    <div key={assignment.id} className="flex items-center justify-between rounded-lg border border-blue-50 bg-blue-50/40 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
                                        <span className={`${compact ? 'text-[12px] text-[var(--color-text-secondary)]' : 'text-xs text-slate-800'} font-black`}>
                                            {roleLabels[assignment.role]} · {scopeLabel(assignment.scope)}
                                        </span>
                                        <button onClick={() => api.removeAssignment(user.id, assignment.id)} className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600 dark:bg-red-500/10 dark:text-red-300">הסר</button>
                                    </div>
                                ))}
                            </div>
                            <RoleScopeForm role={assignmentRole} setRole={setAssignmentRole} scope={assignmentScope} setScope={setAssignmentScope} roleOptions={roleOptions} organizationOptions={api.options} compact={compact} />
                            <button onClick={() => api.addAssignment(user.id, { role: assignmentRole, scope: buildScope(assignmentRole, assignmentScope, api.options) })} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-black text-white">הוסף שיוך ניהולי</button>
                        </section>
                    </div>
                    <div className="space-y-3">
                        <section className={sectionClass}>
                            <h2 className={`${compact ? 'text-[16px] text-[var(--color-text-primary)]' : 'text-base text-slate-950'} mb-2 font-black`}>היסטוריית פעולות</h2>
                            <div className="space-y-2">
                                {user.history.map((item) => (
                                    <div key={item.id} className={`${compact ? 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]' : 'bg-slate-50 text-slate-600'} rounded-md px-2.5 py-1.5 text-[11px] font-bold`}>
                                        {item.text} · {item.time}
                                    </div>
                                ))}
                            </div>
                        </section>
                        <PermissionsExplanationCard compact={compact} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const UserManagementPage = () => {
    const api = useUserManagement();
    const capabilities = useUserManagementCapabilities(api.options.roles);
    const [creating, setCreating] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const selectedUser = api.users.find((user) => user.id === selectedUserId);

    if (selectedUser) {
        return <UserDetailPanel user={selectedUser} api={api} onBack={() => setSelectedUserId(null)} roleOptions={capabilities.allowedRoles} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-col p-6 wave-bg" dir="rtl">
            <header className="mb-4 flex shrink-0 items-end justify-between border-b border-gray-200 pb-4">
                <div>
                    <h1 className="mb-1 text-[26px] font-black tracking-tight text-[#1E3A8A]">ניהול משתמשי הסביבה</h1>
                    <p className="text-sm font-bold text-[#1E4DB7]">יצירת מנהלי מערכת ושיוך הרשאות לפי היררכיית הסביבה.</p>
                </div>
                <div className="flex w-[460px] gap-2">
                    <input value={api.query} onChange={(event) => api.setQuery(event.target.value)} className="h-10 flex-1 rounded-full border border-gray-200 bg-white px-4 text-sm font-bold shadow-sm outline-none" placeholder="חיפוש לפי שם או מספר אישי" />
                    <button onClick={api.search} className="rounded-full bg-blue-600 px-5 text-sm font-black text-white">חפש</button>
                </div>
            </header>
            {api.searched && api.query && !api.filteredUsers.length && (
                <div className="mb-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
                    לא נמצא משתמש קיים עבור {api.query}. ניתן ליצור משתמש חדש.
                </div>
            )}            {api.error && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                    <span>{api.error}</span>
                    <button type="button" onClick={api.retry} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs">ניסיון נוסף</button>
                </div>
            )}
            {api.status === 'loading' && <div className="mb-4 text-sm font-bold text-slate-500">טוען משתמשים ממסד הנתונים…</div>}
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {capabilities.canCreateUsers && (
                        <button onClick={() => setCreating(true)} className="flex min-h-[154px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-transparent p-4 text-center transition hover:border-[#1E4DB7] hover:bg-white">
                            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border bg-white"><Icon name="plus" className="h-5 w-5 text-blue-600" /></span>
                            <span className="text-base font-black text-slate-800">צור משתמש חדש</span>
                        </button>
                    )}
                    {api.filteredUsers.map((user) => <UserCard key={user.id} user={user} onOpen={setSelectedUserId} />)}
                </div>
                {api.pagination.totalPages > 1 && (
                    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="עימוד משתמשים">
                        <button type="button" disabled={!api.pagination.hasPrevious || api.status === 'loading'} onClick={() => api.goToPage(api.page - 1)} className="h-9 rounded-xl border border-blue-100 bg-white px-4 text-xs font-black text-slate-700 disabled:opacity-40">הקודם</button>
                        <span className="text-xs font-black text-slate-600">עמוד {api.pagination.page} מתוך {api.pagination.totalPages}</span>
                        <button type="button" disabled={!api.pagination.hasNext || api.status === 'loading'} onClick={() => api.goToPage(api.page + 1)} className="h-9 rounded-xl border border-blue-100 bg-white px-4 text-xs font-black text-slate-700 disabled:opacity-40">הבא</button>
                    </nav>
                )}
            </div>
            {creating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" dir="rtl">
                    <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <button onClick={() => setCreating(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 text-slate-400"><Icon name="close" className="h-4 w-4" /></button>
                            <h2 className="text-lg font-black text-slate-950">צור משתמש חדש</h2>
                        </div>
                        <CreateUserPanel
                            initialId={api.query}
                            onCancel={() => setCreating(false)}
                            onCreated={(user) => {
                                setCreating(false);
                                setSelectedUserId(user.id);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;


