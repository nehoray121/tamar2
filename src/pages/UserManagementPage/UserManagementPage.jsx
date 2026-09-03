import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { useUserManagement } from '../../features/users/hooks/useUserManagement.js';
import { useUserManagementCapabilities } from '../../features/users/hooks/useUserManagementCapabilities.js';
import { ROLE_KEYS, roleLabels } from '../../features/users/constants/userRoles.js';
import { useSessionStore } from '../../store/session.store.js';

const SYSTEM_ROLE_GUIDE = [
    {
        id: ROLE_KEYS.ENVIRONMENT_ADMIN,
        label: roleLabels[ROLE_KEYS.ENVIRONMENT_ADMIN],
        summary: 'ניהול מלא של סביבה אחת, כולל תתי־הסביבות והחדרים שלה.',
        scope: 'סביבה אחת וכל תתי־הסביבות והחדרים שבתוכה.',
        capabilities: [
            'יצירת תתי־סביבות וחדרים בתוך הסביבה.',
            'ניהול פניות, משתמשים והרשאות בכל חדרי הסביבה.',
            'ניהול הגדרות החדרים והצגת נתוני הדאשבורד בתחום הסביבה.',
            'אישור בקשות גישה לתפקידי חדר בתחום הסביבה.',
            'ללא גישה למרכז השליטה של מנהל־על וללא יצירת סביבות חדשות.'
        ]
    },
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

const scopeTypeLabel = (scope = {}) => ({
    SYSTEM: 'מערכת',
    ENVIRONMENT: 'סביבה',
    SUB_ENVIRONMENT: 'תת־סביבה',
    ROOM: 'חדר'
}[scope.scopeType] || 'תחום ארגוני');

const buildScope = (role, selection, options) => {
    const system = options.systems.find((item) => item.id === selection.systemId) || options.systems[0];
    const environment = options.environments.find((item) => item.id === selection.environmentId)
        || options.environments.find((item) => !system || item.systemId === system.id);
    const subEnvironment = options.subEnvironments.find((item) => item.id === selection.subEnvironmentId)
        || options.subEnvironments.find((item) => !environment || item.environmentId === environment.id);
    const room = options.rooms.find((item) => item.id === selection.roomId)
        || options.rooms.find((item) => !subEnvironment || item.subEnvironmentId === subEnvironment.id);
    if (role === ROLE_KEYS.SUPER_ADMIN && system) return { scopeType: 'SYSTEM', scopeId: system.id, systemId: system.id };
    if (role === ROLE_KEYS.ENVIRONMENT_ADMIN && environment) {
        return {
            scopeType: 'ENVIRONMENT',
            scopeId: environment.id,
            systemId: environment.systemId,
            environmentId: environment.id
        };
    }
    if (role === ROLE_KEYS.SYSTEM_ADMIN && subEnvironment) {

        return { scopeType: 'SUB_ENVIRONMENT', scopeId: subEnvironment.id, systemId: subEnvironment.systemId, environmentId: subEnvironment.environmentId, subEnvironmentId: subEnvironment.id };
    }
    if ([ROLE_KEYS.ROOM_MANAGER, ROLE_KEYS.ROOM_USER].includes(role) && room) {
        return { scopeType: 'ROOM', scopeId: room.id, systemId: room.systemId, environmentId: room.environmentId, subEnvironmentId: room.subEnvironmentId, roomId: room.id };
    }
    return null;
};

const RoleScopeForm = ({
    role,
    setRole,
    scope,
    setScope,
    roleOptions,
    organizationOptions,
    compact = false
}) => {
    const systems = organizationOptions.systems || [];
    const allEnvironments = organizationOptions.environments || [];
    const allSubEnvironments = organizationOptions.subEnvironments || [];
    const allRooms = organizationOptions.rooms || [];
    const permissions = organizationOptions.permissions || {};
    const fieldLocks = permissions.fieldLocks || {};

    const system = systems.find((item) => item.id === scope.systemId)
        || systems[0];
    const environments = allEnvironments.filter(
        (item) => !system || item.systemId === system.id
    );
    const environment = environments.find(
        (item) => item.id === scope.environmentId
    ) || environments[0];
    const subEnvironments = allSubEnvironments.filter(
        (item) => !environment || item.environmentId === environment.id
    );
    const subEnvironment = subEnvironments.find(
        (item) => item.id === scope.subEnvironmentId
    ) || subEnvironments[0];
    const rooms = allRooms.filter(
        (item) => !subEnvironment
            || item.subEnvironmentId === subEnvironment.id
    );

    const selectClass = compact
        ? 'inquiry-input-surface h-10 w-full rounded-xl px-3 text-[12px] font-black disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)] disabled:opacity-80'
        : 'h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-[12px] font-black disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
    const fieldLabelClass = compact
        ? 'mb-1.5 flex items-center justify-between gap-2 text-[11px] font-black text-[var(--color-text-muted)]'
        : 'mb-1.5 flex items-center justify-between gap-2 text-[11px] font-black text-slate-500';

    const selectedRoleLabel = roleOptions.find(
        (item) => item.id === role
    )?.label || 'לא נבחרה הרשאה';
    const previewScope = buildScope(role, scope, organizationOptions);

    const isLocked = (field, visibleCount) => (
        Boolean(fieldLocks[field])
        || visibleCount <= 1
    );

    const roleLocked = isLocked('role', roleOptions.length);
    const systemLocked = isLocked('system', systems.length);
    const environmentLocked = isLocked('environment', environments.length);
    const subEnvironmentLocked = isLocked(
        'subEnvironment',
        subEnvironments.length
    );
    const roomLocked = isLocked('room', rooms.length);

    const LockLabel = ({ locked }) => locked ? (
        <span className="rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-text-muted)]">
            נעול לפי הרשאה
        </span>
    ) : null;

    return (
        <div>
            <div className={`mb-3 rounded-xl border px-3 py-2 ${compact
                ? 'border-[var(--color-border)] bg-[var(--color-surface-muted)]/45'
                : 'border-blue-100 bg-blue-50/45'}`}>
                <p className={`${compact
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-slate-600'} text-[11px] font-bold leading-5`}>
                    <span className="font-black">רמת הרשאה:</span>{' '}
                    {selectedRoleLabel}
                    <span className="mx-2 text-[var(--color-text-muted)]">
                        ·
                    </span>
                    <span className="font-black">סוג תחום:</span>{' '}
                    {scopeTypeLabel(previewScope || {})}
                </p>
                <p className={`${compact
                    ? 'text-[var(--color-text-muted)]'
                    : 'text-slate-500'} mt-0.5 text-[10px] font-bold`}>
                    האפשרויות מגיעות מהשרת ומוגבלות לתחום הסמכות של המנהל המחובר. שדות עם אפשרות חוקית אחת בלבד נעולים ומציגים את הערך המותר.
                </p>
            </div>

            <div className={`grid gap-3 ${compact
                ? 'md:grid-cols-2'
                : 'md:grid-cols-2 xl:grid-cols-5'}`}>
                <label className="min-w-0">
                    <span className={fieldLabelClass}>
                        <span>רמת הרשאה</span>
                        <LockLabel locked={roleLocked} />
                    </span>
                    <select
                        value={role}
                        disabled={roleLocked}
                        onChange={(event) => setRole(event.target.value)}
                        className={selectClass}
                    >
                        {roleOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="min-w-0">
                    <span className={fieldLabelClass}>
                        <span>מערכת</span>
                        <LockLabel locked={systemLocked} />
                    </span>
                    <select
                        value={scope.systemId || system?.id || ''}
                        disabled={systemLocked}
                        onChange={(event) => setScope({
                            systemId: event.target.value
                        })}
                        className={selectClass}
                    >
                        {systems.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </label>

                {role !== ROLE_KEYS.SUPER_ADMIN && (
                    <label className="min-w-0">
                        <span className={fieldLabelClass}>
                            <span>סביבה</span>
                            <LockLabel locked={environmentLocked} />
                        </span>
                        <select
                            value={
                                scope.environmentId
                                || environment?.id
                                || ''
                            }
                            disabled={environmentLocked}
                            onChange={(event) => setScope({
                                systemId: system?.id,
                                environmentId: event.target.value
                            })}
                            className={selectClass}
                        >
                            {environments.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {![ROLE_KEYS.SUPER_ADMIN, ROLE_KEYS.ENVIRONMENT_ADMIN]
                    .includes(role) && (
                    <label className="min-w-0">
                        <span className={fieldLabelClass}>
                            <span>תת־סביבה</span>
                            <LockLabel locked={subEnvironmentLocked} />
                        </span>
                        <select
                            value={
                                scope.subEnvironmentId
                                || subEnvironment?.id
                                || ''
                            }
                            disabled={subEnvironmentLocked}
                            onChange={(event) => setScope({
                                ...scope,
                                systemId: system?.id,
                                environmentId: environment?.id,
                                subEnvironmentId: event.target.value
                            })}
                            className={selectClass}
                        >
                            {subEnvironments.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {[ROLE_KEYS.ROOM_MANAGER, ROLE_KEYS.ROOM_USER]
                    .includes(role) && (
                    <label className="min-w-0">
                        <span className={fieldLabelClass}>
                            <span>חדר</span>
                            <LockLabel locked={roomLocked} />
                        </span>
                        <select
                            value={scope.roomId || rooms[0]?.id || ''}
                            disabled={roomLocked}
                            onChange={(event) => setScope({
                                ...scope,
                                systemId: system?.id,
                                environmentId: environment?.id,
                                subEnvironmentId: subEnvironment?.id,
                                roomId: event.target.value
                            })}
                            className={selectClass}
                        >
                            {rooms.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>
        </div>
    );
};

const PermissionsExplanationCard = ({ compact = false, expanded = false }) => {
    const [activeRoleIndex, setActiveRoleIndex] = useState(0);
    const visibleRoles = useMemo(
        () => SYSTEM_ROLE_GUIDE,
        []
    );

    const sectionTitleClass = compact
        ? 'text-[11px] text-[var(--color-text-muted)]'
        : 'text-[11px] text-slate-500';
    const bodyTextClass = compact
        ? 'text-[12px] leading-5 text-[var(--color-text-secondary)]'
        : 'text-xs leading-[1.45rem] text-slate-600';

    const activeRole = visibleRoles[activeRoleIndex] || visibleRoles[0];
    const totalRoles = visibleRoles.length;

    const goNext = () => {
        if (!totalRoles) return;
        setActiveRoleIndex((current) => (current + 1) % totalRoles);
    };

    const goPrevious = () => {
        if (!totalRoles) return;
        setActiveRoleIndex(
            (current) => (current - 1 + totalRoles) % totalRoles
        );
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            goNext();
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goPrevious();
        }
    };

    return (
        <section
            className={compact
                ? 'rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4 shadow-none'
                : 'rounded-2xl border border-blue-100 bg-white p-4 shadow-sm'}
            onKeyDown={handleKeyDown}
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                    className={`${compact
                        ? 'text-[16px] text-[var(--color-text-primary)]'
                        : 'text-base text-slate-950'} font-black`}
                >
                    הסבר הרשאות מערכת
                </h2>

                <div
                    className="flex items-center gap-1.5"
                    aria-label="בחירת סוג הרשאה"
                >
                    {visibleRoles.map((role, index) => (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => setActiveRoleIndex(index)}
                            className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${activeRoleIndex === index
                                    ? 'w-5 bg-[var(--color-primary)]'
                                    : 'w-2.5 bg-[var(--color-border-strong)] hover:bg-[var(--color-primary)]/45'
                                }`}
                            aria-label={`הצג הרשאה ${role.label}`}
                            aria-current={activeRoleIndex === index ? 'true' : undefined}
                        />
                    ))}
                </div>
            </div>

            {activeRole ? (
                <div
                    tabIndex={0}
                    aria-label="הסבר הרשאות מערכת לפי תפקידים"
                    className={`flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${expanded
                            ? (compact ? 'min-h-[420px]' : 'min-h-[520px]')
                            : (compact ? 'min-h-[300px]' : 'min-h-[320px]')
                        }`}
                >
                    <article
                        key={activeRole.id}
                        className="permission-role-slide flex-1 py-3"
                    >
                        <header className="mb-2 flex items-center gap-3">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                                aria-hidden="true"
                            />
                            <h3
                                className={`${compact
                                    ? 'text-[13px] text-[var(--color-text-primary)]'
                                    : 'text-sm text-slate-900'} font-black`}
                            >
                                {activeRole.label}
                            </h3>
                        </header>

                        <p className={`${bodyTextClass} mb-2 font-bold`}>
                            {activeRole.summary}
                        </p>

                        <div className="mb-3 rounded-xl bg-[var(--color-surface-muted)]/35 px-3 py-2">
                            <span className={`${sectionTitleClass} block font-black`}>
                                תחום הרשאה
                            </span>
                            <span className={`${bodyTextClass} mt-1 block font-bold`}>
                                {activeRole.scope}
                            </span>
                        </div>

                        <div>
                            <h4 className={`${sectionTitleClass} mb-1 font-black`}>
                                מה ניתן לבצע
                            </h4>
                            <ul className={`${bodyTextClass} list-disc space-y-1 pr-4 font-bold marker:text-[var(--color-primary)]`}>
                                {activeRole.capabilities.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </article>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                        <button
                            type="button"
                            onClick={goPrevious}
                            disabled={totalRoles <= 1}
                            className="inquiry-control inline-flex h-9 w-11 items-center justify-center rounded-xl text-lg font-black text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="להרשאה הבאה"
                            title="להרשאה הבאה"
                        >
                            →
                        </button>

                        <span className="text-[10px] font-black text-[var(--color-text-muted)]">
                            {activeRoleIndex + 1} מתוך {totalRoles}
                        </span>

                        <button
                            type="button"
                            onClick={goNext}
                            disabled={totalRoles <= 1}
                            className="inquiry-control inline-flex h-9 w-11 items-center justify-center rounded-xl text-lg font-black text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="להרשאה הקודמת"
                            title="להרשאה הקודמת"
                        >
                            ←
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex min-h-[180px] items-center justify-center text-center text-xs font-bold text-[var(--color-text-muted)]">
                    אין מידע על הרשאות להצגה.
                </div>
            )}
        </section>
    );
};

export const CreateUserPanel = ({
    initialId = '',
    onCancel,
    onCreated,
    managementApi = null
}) => {
    const fallbackApi = useUserManagement();
    const api = managementApi || fallbackApi;
    const capabilities = useUserManagementCapabilities(api.options);
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
        <button type="button" onClick={() => onOpen(user.id)} className="mt-3 h-9 w-full rounded-lg bg-blue-600 px-3 text-xs font-black text-white">ניהול משתמש</button>
    </article>
);

export const UserDetailPanel = ({ user, api, roleOptions, onBack, compact = false }) => {
    const initialRole = user.primaryRole || roleOptions[0]?.id || '';
    const [assignmentRole, setAssignmentRole] = useState(initialRole);
    const [assignmentScope, setAssignmentScope] = useState(user.primaryScope || {});
    const [displayName, setDisplayName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [busyAction, setBusyAction] = useState('');
    const [operationError, setOperationError] = useState('');
    const [operationSuccess, setOperationSuccess] = useState('');

    useEffect(() => {
        setDisplayName(user.name || '');
        setEmail(user.email || '');
    }, [user.id, user.name, user.email]);

    useEffect(() => {
        setAssignmentRole(user.primaryRole || roleOptions[0]?.id || '');
        setAssignmentScope(user.primaryScope || {});
    }, [user.id]);

    const sectionClass = compact
        ? 'rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4 shadow-none'
        : 'rounded-2xl border border-blue-100 bg-white p-4 shadow-sm';
    const assignmentCardClass = compact
        ? 'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/45 p-3'
        : 'rounded-xl border border-blue-100 bg-blue-50/35 p-3';

    const memberships = Array.isArray(user.memberships) && user.memberships.length
        ? user.memberships
        : [
            user.primaryScope,
            ...(Array.isArray(user.assignments) ? user.assignments : [])
        ].filter(Boolean);

    const managementPermissions = api.options?.permissions || {};
    const canEditProfile = managementPermissions.canEditUserProfile !== false;
    const canSetUserActive = managementPermissions.canSetUserActive !== false;
    const canManageMemberships = managementPermissions.canManageMemberships !== false;
    const roomManagerOnly = Boolean(managementPermissions.roomManagerOnly);

    const runAction = async (actionName, successMessage, operation) => {
        if (busyAction) return null;

        setBusyAction(actionName);
        setOperationError('');
        setOperationSuccess('');

        try {
            const result = await operation();
            setOperationSuccess(successMessage);
            return result;
        } catch (actionError) {
            setOperationError(
                actionError?.message
                || 'הפעולה נכשלה. בדקו את הרשאות המנהל ונסו שוב.'
            );
            return null;
        } finally {
            setBusyAction('');
        }
    };

    const handleProfileSave = () => {
        if (!canEditProfile) {
            setOperationSuccess('');
            setOperationError(
                'למנהל חדר מותר לנהל שיוכי חדר בלבד. עריכת פרטי המשתמש אינה זמינה בהרשאה זו.'
            );
            return;
        }

        const normalizedName = displayName.trim();
        const normalizedEmail = email.trim();

        if (!normalizedName) {
            setOperationSuccess('');
            setOperationError('יש להזין שם משתמש.');
            return;
        }

        const updates = {};

        if (normalizedName !== (user.name || '')) {
            updates.displayName = normalizedName;
        }

        if (normalizedEmail !== (user.email || '')) {
            updates.email = normalizedEmail;
        }

        if (!Object.keys(updates).length) {
            setOperationError('');
            setOperationSuccess('לא נמצאו שינויים בפרטי המשתמש.');
            return;
        }

        runAction(
            'profile',
            'פרטי המשתמש נשמרו בהצלחה.',
            () => api.updateUserProfile(user.id, updates)
        );
    };

    const handleAddAssignment = () => {
        if (!canManageMemberships) {
            setOperationSuccess('');
            setOperationError('אין הרשאה להוסיף שיוכים למשתמש.');
            return;
        }

        const canonicalScope = buildScope(
            assignmentRole,
            assignmentScope,
            api.options
        );

        if (!assignmentRole || !canonicalScope) {
            setOperationSuccess('');
            setOperationError(
                'יש לבחור רמת הרשאה ותחום ארגוני תקינים.'
            );
            return;
        }

        const duplicate = memberships.some((membership) => (
            membership?.role === assignmentRole
            && String(membership?.scopeId)
                === String(canonicalScope.scopeId)
        ));

        if (duplicate) {
            setOperationSuccess('');
            setOperationError(
                'השיוך הזה כבר קיים למשתמש.'
            );
            return;
        }

        runAction(
            'assignment',
            'השיוך נוסף למשתמש. שיוכים קיימים נשמרו.',
            () => api.addAssignment(user.id, {
                role: assignmentRole,
                scope: canonicalScope
            })
        );
    };

    const handleRemoveAssignment = (membership) => {
        if (!membership?.id) return;

        if (!canManageMemberships) {
            setOperationSuccess('');
            setOperationError('אין הרשאה להסיר את השיוך הזה.');
            return;
        }

        if (membership.role === ROLE_KEYS.SUPER_ADMIN) {
            setOperationSuccess('');
            setOperationError(
                'הרשאת מנהל־על מוגנת ואינה ניתנת להסרה מהמסלול הרגיל.'
            );
            return;
        }

        if (
            typeof window !== 'undefined'
            && !window.confirm(
                `להסיר את השיוך "${membership.roleLabel || membership.role}" מתוך "${membership.scopeLabel || 'התחום שנבחר'}"?`
            )
        ) return;

        runAction(
            `remove-${membership.id}`,
            'השיוך הוסר בהצלחה.',
            () => api.removeAssignment(user.id, membership.id)
        );
    };

    const handleToggleActive = () => {
        if (!canSetUserActive) {
            setOperationSuccess('');
            setOperationError(
                'הרשאה זו מאפשרת ניהול שיוכי חדר בלבד ואינה מאפשרת השבתה או הפעלה של משתמשים.'
            );
            return;
        }

        const nextActive = user.status !== 'active';

        if (
            !nextActive
            && typeof window !== 'undefined'
            && !window.confirm(
                'להשבית את המשתמש? ההשבתה מסירה ממנו גישה למערכת אך שומרת את הרשומה לצורכי ביקורת.'
            )
        ) return;

        runAction(
            'active',
            nextActive
                ? 'המשתמש הופעל בהצלחה.'
                : 'המשתמש הושבת בהצלחה.',
            () => api.setUserActive(user.id, nextActive)
        );
    };

    return (
        <div className={`h-full overflow-y-auto ${compact ? '' : 'p-3'}`} dir="rtl">
            <div className={`mx-auto flex w-full flex-col gap-3 ${compact ? '' : 'max-w-[1160px]'}`}>
                {onBack && (
                    <button type="button"
                        onClick={onBack}
                        className={`${compact
                            ? 'inquiry-control h-10 rounded-xl px-4 text-[12px] font-black text-[var(--color-text-secondary)]'
                            : 'w-fit rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700'}`}
                    >
                        חזרה לניהול משתמשים
                    </button>
                )}

                {(operationError || operationSuccess) && (
                    <div className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${
                        operationError
                            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                    }`}>
                        {operationError || operationSuccess}
                    </div>
                )}

                {roomManagerOnly && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-800 dark:border-blue-400/25 dark:bg-blue-500/10 dark:text-blue-200">
                        מנהל חדר יכול להוסיף או להסיר משתמשי חדר רק בחדרים שבתחום סמכותו. פרטי המשתמש, סטטוס המשתמש ושדות שמחוץ לתחום נעולים.
                    </div>
                )}

                <section className={sectionClass}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                                <Icon name="user" className="h-5 w-5" />
                            </span>
                            <div>
                                <h1 className={`${compact ? 'text-xl text-[var(--color-text-primary)]' : 'text-lg text-slate-950'} font-black`}>{user.name}</h1>
                                <p className={`${compact ? 'text-[12px] text-[var(--color-text-muted)]' : 'text-xs text-slate-500'} font-bold`}>
                                    מזהה: {user.personalNumberMasked || user.id}
                                </p>
                                <p className={`${compact ? 'text-[12px] text-[var(--color-text-muted)]' : 'text-xs text-slate-500'} font-bold`}>
                                    {memberships.length} שיוכים פעילים
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={Boolean(busyAction) || !canSetUserActive}
                            onClick={handleToggleActive}
                            title={!canSetUserActive ? 'אין הרשאה לשנות את סטטוס המשתמש' : undefined}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                                user.status === 'active'
                                    ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                            }`}
                        >
                            {busyAction === 'active'
                                ? 'שומר...'
                                : user.status === 'active'
                                    ? 'השבת משתמש'
                                    : 'הפעל משתמש'}
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block text-[11px] font-black text-[var(--color-text-muted)]">
                            שם מלא
                            <input
                                value={displayName}
                                disabled={!canEditProfile}
                                onChange={(event) => setDisplayName(event.target.value)}
                                className="inquiry-input-surface disabled:cursor-not-allowed disabled:opacity-60 mt-1.5 h-10 w-full rounded-xl px-3 text-[12px] font-bold"
                            />
                        </label>
                        <label className="block text-[11px] font-black text-[var(--color-text-muted)]">
                            דואר אלקטרוני
                            <input
                                type="email"
                                value={email}
                                disabled={!canEditProfile}
                                onChange={(event) => setEmail(event.target.value)}
                                className="inquiry-input-surface disabled:cursor-not-allowed disabled:opacity-60 mt-1.5 h-10 w-full rounded-xl px-3 text-[12px] font-bold"
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        disabled={Boolean(busyAction) || !canEditProfile}
                        onClick={handleProfileSave}
                        title={!canEditProfile ? 'אין הרשאה לערוך פרטי משתמש' : undefined}
                        className="mt-3 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busyAction === 'profile' ? 'שומר...' : 'שמור פרטי משתמש'}
                    </button>
                </section>

                <div className={`grid gap-3 ${compact ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,2.15fr)_minmax(340px,1fr)] xl:items-start'}`}>
                    <div className="space-y-3">
                        <section className={sectionClass}>
                            <div className="mb-3">
                                <h2 className={`${compact ? 'text-[16px] text-[var(--color-text-primary)]' : 'text-base text-slate-950'} font-black`}>שיוך משתמש</h2>
                                <p className={`${compact ? 'text-[var(--color-text-muted)]' : 'text-slate-500'} mt-1 text-[11px] font-bold`}>
                                    כל שמירה מוסיפה שיוך נוסף ואינה מחליפה את השיוכים הקיימים. משתמש יכול להיות משויך למספר חדרים או תחומים, בכפוף להרשאות המנהל המחובר.
                                </p>
                            </div>

                            <RoleScopeForm
                                role={assignmentRole}
                                setRole={setAssignmentRole}
                                scope={assignmentScope}
                                setScope={setAssignmentScope}
                                roleOptions={roleOptions}
                                organizationOptions={api.options}
                                compact={compact}
                            />

                            <button
                                type="button"
                                disabled={Boolean(busyAction) || !roleOptions.length || !canManageMemberships}
                                onClick={handleAddAssignment}
                                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busyAction === 'assignment'
                                    ? 'מוסיף...'
                                    : 'הוסף שיוך משתמש'}
                            </button>

                            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className={`${compact ? 'text-[var(--color-text-primary)]' : 'text-slate-900'} text-[13px] font-black`}>
                                        שיוכים קיימים
                                    </h3>
                                    <span className={`${compact ? 'text-[var(--color-text-muted)]' : 'text-slate-500'} text-[10px] font-bold`}>
                                        {memberships.length} שיוכים פעילים
                                    </span>
                                </div>

                                {memberships.length ? (
                                    <div className="grid gap-2 md:grid-cols-2">
                                        {memberships.map((membership) => {
                                            const isPrimary = (
                                                membership.id
                                                && membership.id === user.primaryScope?.id
                                            );

                                            return (
                                                <article
                                                    key={membership.id || `${membership.role}-${membership.scopeId}`}
                                                    className={assignmentCardClass}
                                                >
                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-lg bg-[var(--color-primary-soft)] px-2 py-1 text-[10px] font-black text-[var(--color-primary)]">
                                                                {scopeTypeLabel(membership)}
                                                            </span>
                                                            {isPrimary && (
                                                                <span className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[9px] font-black text-[var(--color-text-muted)]">
                                                                    ראשי
                                                                </span>
                                                            )}
                                                        </div>

                                                        {membership.role === ROLE_KEYS.SUPER_ADMIN ? (
                                                            <span className="text-[9px] font-black text-[var(--color-text-muted)]">
                                                                הרשאה מוגנת
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={Boolean(busyAction)}
                                                                onClick={() => handleRemoveAssignment(membership)}
                                                                className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-black text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300"
                                                            >
                                                                {busyAction === `remove-${membership.id}`
                                                                    ? 'מסיר...'
                                                                    : 'הסר שיוך'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div>
                                                            <span className={`${compact ? 'text-[var(--color-text-muted)]' : 'text-slate-500'} block text-[10px] font-bold`}>
                                                                רמת הרשאה
                                                            </span>
                                                            <strong className={`${compact ? 'text-[var(--color-text-primary)]' : 'text-slate-900'} mt-0.5 block text-[12px]`}>
                                                                {membership.roleLabel || roleLabels[membership.role] || membership.role}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            <span className={`${compact ? 'text-[var(--color-text-muted)]' : 'text-slate-500'} block text-[10px] font-bold`}>
                                                                תחום הרשאה
                                                            </span>
                                                            <strong className={`${compact ? 'text-[var(--color-text-primary)]' : 'text-slate-900'} mt-0.5 block text-[12px]`}>
                                                                {scopeLabel(membership)}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={`${compact
                                        ? 'border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 text-[var(--color-text-muted)]'
                                        : 'border-blue-100 bg-blue-50/30 text-slate-500'} rounded-xl border border-dashed px-3 py-4 text-center text-[11px] font-bold`}>
                                        אין למשתמש שיוכים פעילים.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-3">
                        <PermissionsExplanationCard compact={compact} expanded />
                    </div>
                </div>
            </div>
        </div>
    );
};

const UserManagementPage = () => {
    const navigate = useSessionStore((state) => state.navigate);
    const api = useUserManagement();
    const capabilities = useUserManagementCapabilities(api.options);
    const [creating, setCreating] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const selectedUser = api.users.find((user) => user.id === selectedUserId);

    if (selectedUser) {
        return <UserDetailPanel user={selectedUser} api={api} onBack={() => setSelectedUserId(null)} roleOptions={capabilities.allowedRoles} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-col p-6 wave-bg" dir="rtl">
            <div className="mb-3 flex shrink-0 items-center justify-start">
                <button
                    type="button"
                    onClick={() => navigate('hierarchy')}
                    className="inquiry-control inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[12px] font-black text-[var(--color-text-secondary)]"
                >
                    <span aria-hidden="true">→</span>
                    חזרה לתתי־סביבות
                </button>
            </div>

            <header className="mb-4 flex shrink-0 items-end justify-between border-b border-gray-200 pb-4">
                <div>
                    <h1 className="mb-1 text-[26px] font-black tracking-tight text-[#1E3A8A]">ניהול משתמשי הסביבה</h1>
                    <p className="text-sm font-bold text-[#1E4DB7]">יצירת מנהלי מערכת ושיוך הרשאות לפי היררכיית הסביבה.</p>
                </div>
                <div className="flex w-[460px] gap-2">
                    <input value={api.query} onChange={(event) => api.setQuery(event.target.value)} className="h-10 flex-1 rounded-full border border-gray-200 bg-white px-4 text-sm font-bold shadow-sm outline-none" placeholder="חיפוש לפי שם או מספר אישי" />
                    <button type="button" onClick={api.search} className="rounded-full bg-blue-600 px-5 text-sm font-black text-white">חפש</button>
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
                        <button type="button" onClick={() => setCreating(true)} className="flex min-h-[154px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-transparent p-4 text-center transition hover:border-[#1E4DB7] hover:bg-white">
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
                            <button type="button" onClick={() => setCreating(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 text-slate-400"><Icon name="close" className="h-4 w-4" /></button>
                            <h2 className="text-lg font-black text-slate-950">צור משתמש חדש</h2>
                        </div>
                        <CreateUserPanel
                            initialId={api.query}
                            managementApi={api}
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


