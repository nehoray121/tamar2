import React, { useMemo, useState } from 'react';
import { CompactTable, Drawer, KpiStrip, StatusBadge, SuperAdminCard } from './SuperAdminPrimitives.jsx';
import { useUserManagement } from '../../users/hooks/useUserManagement.js';
import { useUserManagementCapabilities } from '../../users/hooks/useUserManagementCapabilities.js';
import { CreateUserPanel, UserDetailPanel } from '../../../pages/UserManagementPage/UserManagementPage.jsx';

const PAGE_SIZE = 5;

const UsersPermissionsTab = ({ data, onRefresh }) => {
    const api = useUserManagement();
    const capabilities = useUserManagementCapabilities(api.options.roles);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [drawerItem, setDrawerItem] = useState(null);

    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase('he-IL');

        return api.users.filter((user) => {
            const searchable = [
                user.name,
                user.personalNumberMasked,
                user.email,
                user.primaryScope?.scopeLabel
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('he-IL');

            const matchesQuery = (
                !normalizedQuery
                || searchable.includes(normalizedQuery)
            );
            const matchesRole = (
                roleFilter === 'all'
                || user.primaryRole === roleFilter
            );
            const matchesStatus = (
                statusFilter === 'all'
                || user.status === statusFilter
            );

            return matchesQuery && matchesRole && matchesStatus;
        });
    }, [api.users, query, roleFilter, statusFilter]);

    const pageCount = Math.max(
        1,
        Math.ceil(filteredRows.length / PAGE_SIZE)
    );
    const safePage = Math.min(page, pageCount - 1);
    const pageRows = filteredRows.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE
    );

    const rows = pageRows.map((user) => ({
        id: user.id,
        raw: user,
        cells: [
            user.name,
            user.personalNumberMasked || user.id,
            user.primaryScope?.roleLabel || user.primaryRole || '-',
            user.primaryScope?.scopeLabel || '-',
            user.status === 'active' ? 'פעיל' : 'לא פעיל',
            user.lastLoginAt || user.updatedAt || '-',
            '-'
        ]
    }));

    const managedUser = drawerItem?.id
        ? api.users.find((user) => user.id === drawerItem.id)
        : null;

    const refreshAfter = async (operation) => {
        const result = await operation;
        onRefresh?.();
        return result;
    };

    const managementApi = {
        ...api,
        createUser: (...args) => refreshAfter(api.createUser(...args)),
        updateUserProfile: (...args) => refreshAfter(api.updateUserProfile(...args)),
        updatePrimary: (...args) => refreshAfter(api.updatePrimary(...args)),
        addAssignment: (...args) => refreshAfter(api.addAssignment(...args)),
        removeAssignment: (...args) => refreshAfter(api.removeAssignment(...args)),
        setUserActive: (...args) => refreshAfter(api.setUserActive(...args))
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <KpiStrip
                items={data.users.kpis.map((item) => ({
                    ...item,
                    id: item.title,
                    subtitle: 'בטווח הבחירה',
                    icon: item.tone === 'danger'
                        ? 'alertTriangle'
                        : 'users'
                }))}
            />

            <SuperAdminCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-3">
                    <div className="flex flex-wrap gap-2">
                        <input
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(0);
                            }}
                            className="inquiry-input-surface h-9 w-52 rounded-lg px-3 text-[12px] font-bold outline-none"
                            placeholder="חיפוש משתמש..."
                        />

                        <select
                            value={roleFilter}
                            onChange={(event) => {
                                setRoleFilter(event.target.value);
                                setPage(0);
                            }}
                            className="inquiry-input-surface h-9 rounded-lg px-3 text-[12px] font-bold"
                        >
                            <option value="all">כל התפקידים</option>
                            {capabilities.allowedRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(0);
                            }}
                            className="inquiry-input-surface h-9 rounded-lg px-3 text-[12px] font-bold"
                        >
                            <option value="all">כל הסטטוסים</option>
                            <option value="active">פעיל</option>
                            <option value="inactive">לא פעיל</option>
                        </select>
                    </div>

                    {capabilities.canCreateUsers && (
                        <button
                            type="button"
                            onClick={() => setDrawerItem({ mode: 'create' })}
                            className="h-9 rounded-lg bg-[var(--color-primary)] px-3 text-[12px] font-black text-white"
                        >
                            הוספת משתמש +
                        </button>
                    )}
                </div>

                {api.error && (
                    <div className="m-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700">
                        <span>{api.error}</span>
                        <button
                            type="button"
                            onClick={api.retry}
                            className="rounded-lg border border-red-200 px-3 py-1"
                        >
                            ניסיון נוסף
                        </button>
                    </div>
                )}

                {api.status === 'loading' ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center text-[13px] font-bold text-[var(--color-text-muted)]">
                        טוען משתמשים והרשאות…
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 p-3">
                        <CompactTable
                            columns={[
                                'משתמש',
                                'מזהה',
                                'תפקיד ראשי',
                                'תחום ארגוני',
                                'סטטוס',
                                'פעילות אחרונה',
                                'חריגות'
                            ]}
                            rows={rows}
                            onRowClick={(row) => setDrawerItem({
                                mode: 'manage',
                                id: row.raw.id,
                                name: row.raw.name
                            })}
                        />
                    </div>
                )}

                <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] px-3 py-2 text-[12px] font-bold text-[var(--color-text-muted)]">
                    <span>עמוד {safePage + 1} מתוך {pageCount}</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="inquiry-control h-8 rounded-lg px-3"
                            disabled={safePage === 0}
                            onClick={() => setPage(
                                (value) => Math.max(0, value - 1)
                            )}
                        >
                            הקודם
                        </button>
                        <button
                            type="button"
                            className="inquiry-control h-8 rounded-lg px-3"
                            disabled={safePage >= pageCount - 1}
                            onClick={() => setPage(
                                (value) => Math.min(
                                    pageCount - 1,
                                    value + 1
                                )
                            )}
                        >
                            הבא
                        </button>
                    </div>
                </div>
            </SuperAdminCard>

            <Drawer
                title={
                    drawerItem?.mode === 'create'
                        ? 'יצירת משתמש חדש'
                        : managedUser?.name
                            || drawerItem?.name
                            || 'ניהול משתמש'
                }
                subtitle={
                    drawerItem?.mode === 'create'
                        ? 'יצירת משתמש לפי ההרשאות והתחומים שהשרת מתיר למנהל המחובר.'
                        : 'עריכת פרטי המשתמש והשיוך בהתאם לסמכות המנהל המחובר.'
                }
                item={drawerItem}
                onClose={() => setDrawerItem(null)}
                widthClassName="max-w-[760px]"
            >
                {drawerItem?.mode === 'create' ? (
                    <CreateUserPanel
                        initialId={query}
                        managementApi={managementApi}
                        onCancel={() => setDrawerItem(null)}
                        onCreated={(user) => setDrawerItem({
                            mode: 'manage',
                            id: user.id,
                            name: user.name
                        })}
                    />
                ) : managedUser ? (
                    <UserDetailPanel
                        user={managedUser}
                        api={managementApi}
                        roleOptions={capabilities.allowedRoles}
                        compact
                    />
                ) : drawerItem?.id ? (
                    <div className="space-y-3 text-[13px] font-semibold leading-6 text-[var(--color-text-secondary)]">
                        <StatusBadge severity="warning">
                            המשתמש אינו זמין לעריכה
                        </StatusBadge>
                        <p>
                            ייתכן שהמשתמש אינו נמצא עוד בתחום ההרשאה
                            של המנהל המחובר או שהרשימה טרם התרעננה.
                        </p>
                        <button
                            type="button"
                            onClick={api.retry}
                            className="inquiry-control h-9 rounded-lg px-3"
                        >
                            רענן משתמשים
                        </button>
                    </div>
                ) : null}
            </Drawer>
        </div>
    );
};

export default UsersPermissionsTab;
