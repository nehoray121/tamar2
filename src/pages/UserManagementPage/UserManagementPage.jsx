import React, { useEffect, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { useUserManagement } from '../../features/users/hooks/useUserManagement.js';
import { useUserManagementCapabilities } from '../../features/users/hooks/useUserManagementCapabilities.js';
import { roleLabels } from '../../features/users/data/mockUserManagementData.js';
import { mockUserDirectory, scopeTree } from '../../features/users/data/mockUserDirectory.js';

const scopeLabel = (scope = {}) => {
    const env = scopeTree.environments.find((item) => item.id === scope.environmentId);
    const sub = env?.subEnvironments.find((item) => item.id === scope.subEnvironmentId);
    const room = sub?.rooms.find((item) => item.id === scope.roomId);
    return [env?.name, sub?.name, room?.name].filter(Boolean).join(' / ') || 'כל המערכת';
};

const RoleScopeForm = ({ role, setRole, scope, setScope, roleOptions }) => {
    const env = scopeTree.environments.find((item) => item.id === scope.environmentId) || scopeTree.environments[0];
    const sub = env?.subEnvironments.find((item) => item.id === scope.subEnvironmentId) || env?.subEnvironments[0];

    return (
        <div className="grid gap-3 md:grid-cols-4">
            <select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-xl border border-blue-100 px-3 text-sm font-black">
                {roleOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            {role !== 'super_admin' && (
                <select value={scope.environmentId || env.id} onChange={(event) => setScope({ environmentId: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm font-black">
                    {scopeTree.environments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            )}
            {(role === 'sub_environment_admin' || role === 'room_admin') && (
                <select value={scope.subEnvironmentId || sub?.id} onChange={(event) => setScope({ ...scope, subEnvironmentId: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm font-black">
                    {env?.subEnvironments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            )}
            {role === 'room_admin' && (
                <select value={scope.roomId || sub?.rooms[0]?.id} onChange={(event) => setScope({ ...scope, roomId: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm font-black">
                    {sub?.rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            )}
        </div>
    );
};

const CreateUserDialog = ({ open, initialId, onClose, onCreate, roleOptions }) => {
    const [id, setId] = useState(initialId || '');
    const [role, setRole] = useState(roleOptions[0]?.id || 'room_admin');
    const [scope, setScope] = useState({ environmentId: 'technology', subEnvironmentId: 'ops', roomId: 'manday' });

    useEffect(() => {
        if (open) {
            setId(initialId || '');
            setRole(roleOptions[0]?.id || 'room_admin');
        }
    }, [initialId, open, roleOptions]);

    if (!open) return null;

    const directoryUser = mockUserDirectory[id];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" dir="rtl">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 text-slate-400"><Icon name="close" className="h-4 w-4" /></button>
                    <h2 className="text-xl font-black text-slate-950">צור משתמש חדש</h2>
                </div>
                <label className="mb-4 block text-sm font-black text-slate-800">
                    תעודת זהות / מספר אישי
                    <input value={id} onChange={(event) => setId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-blue-100 px-3 text-sm font-bold" />
                </label>
                <div className="mb-4 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-slate-700">{directoryUser?.name || 'משתמש חדש'} · {id || 'לא הוזן מספר'}</div>
                <RoleScopeForm role={role} setRole={setRole} scope={scope} setScope={setScope} roleOptions={roleOptions} />
                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">ביטול</button>
                    <button onClick={() => onCreate({ id, role, scope })} disabled={!id.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">צור משתמש</button>
                </div>
            </div>
        </div>
    );
};

const UserCard = ({ user, onOpen }) => (
    <article className="rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-sm">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500"><Icon name="user" className="h-6 w-6" /></span>
        <h3 className="text-lg font-black text-slate-950">{user.name}</h3>
        <p className="text-xs font-bold text-slate-500">ת״ז: {user.id}</p>
        <div className="mt-3 flex justify-center gap-2">
            <span className={`rounded-lg px-2 py-1 text-xs font-black ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{user.status === 'active' ? 'פעיל' : 'מושבת'}</span>
            <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{roleLabels[user.primaryRole]}</span>
        </div>
        <p className="mt-3 min-h-[32px] text-xs font-bold text-slate-500">{scopeLabel(user.primaryScope)}</p>
        <button onClick={() => onOpen(user.id)} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">ניהול משתמש</button>
    </article>
);

const UserDetail = ({ user, api, onBack, roleOptions }) => {
    const [role, setRole] = useState(user.primaryRole);
    const [scope, setScope] = useState(user.primaryScope || {});
    const [assignmentRole, setAssignmentRole] = useState(roleOptions[0]?.id || 'room_admin');
    const [assignmentScope, setAssignmentScope] = useState({ environmentId: 'technology', subEnvironmentId: 'ops', roomId: 'manday' });

    return (
        <div className="h-full overflow-y-auto p-6" dir="rtl">
            <button onClick={onBack} className="mb-4 rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-black text-slate-700">חזרה לניהול משתמשים</button>
            <section className="mb-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500"><Icon name="user" className="h-8 w-8" /></span>
                        <div>
                            <h1 className="text-2xl font-black text-slate-950">{user.name}</h1>
                            <p className="text-sm font-bold text-slate-500">ת״ז: {user.id}</p>
                            <p className="text-sm font-bold text-slate-500">{roleLabels[user.primaryRole]} · {scopeLabel(user.primaryScope)}</p>
                        </div>
                    </div>
                    <button onClick={() => api.setUserActive(user.id, user.status !== 'active')} className={`rounded-xl px-4 py-2 text-sm font-black ${user.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{user.status === 'active' ? 'השבת משתמש' : 'הפעל משתמש'}</button>
                </div>
            </section>
            <section className="mb-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-xl font-black text-slate-950">עריכת דרגה ראשית</h2>
                <RoleScopeForm role={role} setRole={setRole} scope={scope} setScope={setScope} roleOptions={roleOptions} />
                <button onClick={() => api.updatePrimary(user.id, { role, scope })} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">שמור דרגה ראשית</button>
            </section>
            <section className="mb-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-xl font-black text-slate-950">שיוכים ניהוליים נוספים</h2>
                <div className="mb-4 space-y-2">
                    {user.assignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between rounded-2xl border border-blue-50 bg-blue-50/40 px-3 py-2">
                            <span className="text-sm font-black text-slate-800">{roleLabels[assignment.role]} · {scopeLabel(assignment.scope)}</span>
                            <button onClick={() => api.removeAssignment(user.id, assignment.id)} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-600">הסר</button>
                        </div>
                    ))}
                </div>
                <RoleScopeForm role={assignmentRole} setRole={setAssignmentRole} scope={assignmentScope} setScope={setAssignmentScope} roleOptions={roleOptions} />
                <button onClick={() => api.addAssignment(user.id, { role: assignmentRole, scope: assignmentScope })} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">הוסף שיוך ניהולי</button>
            </section>
            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-xl font-black text-slate-950">היסטוריית פעולות</h2>
                <div className="space-y-2">{user.history.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">{item.text} · {item.time}</div>)}</div>
            </section>
        </div>
    );
};

const UserManagementPage = () => {
    const api = useUserManagement();
    const capabilities = useUserManagementCapabilities();
    const [creating, setCreating] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const selectedUser = api.users.find((user) => user.id === selectedUserId);

    if (selectedUser) {
        return <UserDetail user={selectedUser} api={api} onBack={() => setSelectedUserId(null)} roleOptions={capabilities.allowedRoles} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-col p-8 wave-bg" dir="rtl">
            <header className="mb-6 flex shrink-0 items-end justify-between border-b border-gray-200 pb-5">
                <div>
                    <h1 className="mb-2 text-[28px] font-black tracking-tight text-[#1E3A8A]">ניהול משתמשי הסביבה</h1>
                    <p className="text-sm font-bold text-[#1E4DB7]">יצירת מנהלי מערכת ושיוך הרשאות לפי היררכיית הסביבה.</p>
                </div>
                <div className="flex w-[460px] gap-2">
                    <input value={api.query} onChange={(event) => api.setQuery(event.target.value)} className="h-11 flex-1 rounded-full border border-gray-200 bg-white px-5 text-sm font-bold shadow-sm outline-none" placeholder="חיפוש לפי שם או מספר אישי" />
                    <button onClick={api.search} className="rounded-full bg-blue-600 px-5 text-sm font-black text-white">חפש</button>
                </div>
            </header>
            {api.searched && api.query && !api.filteredUsers.length && (
                <div className="mb-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
                    לא נמצא משתמש קיים עבור {api.query}. ניתן ליצור משתמש חדש.
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {capabilities.canCreateUsers && (
                        <button onClick={() => setCreating(true)} className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#CBD5E1] bg-transparent p-6 text-center transition hover:border-[#1E4DB7] hover:bg-white">
                            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border bg-white"><Icon name="plus" className="h-6 w-6 text-blue-600" /></span>
                            <span className="text-lg font-black text-slate-800">צור משתמש חדש</span>
                        </button>
                    )}
                    {api.filteredUsers.map((user) => <UserCard key={user.id} user={user} onOpen={setSelectedUserId} />)}
                </div>
            </div>
            <CreateUserDialog
                open={creating}
                initialId={api.query}
                roleOptions={capabilities.allowedRoles}
                onClose={() => setCreating(false)}
                onCreate={async (payload) => {
                    const user = await api.createUser(payload);
                    setCreating(false);
                    setSelectedUserId(user.id);
                }}
            />
        </div>
    );
};

export default UserManagementPage;
