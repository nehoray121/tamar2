# Deprecated frontend role migration risk

The Phase 2A backend accepts only uppercase canonical roles. The existing frontend was inspected but not changed.

## Proposed mapping

| Existing frontend value | Canonical backend role | Migration rule |
| --- | --- | --- |
| `super_admin` | `SUPER_ADMIN` | Map only when the value represents a user role, not a route/view identifier. |
| `sub_environment_admin` | `SYSTEM_ADMIN` | Safe semantic mapping after the target sub-environment is validated. |
| `room_admin` | `ROOM_MANAGER` | Safe semantic mapping after the target room is validated. |
| `environment_admin` | Unresolved | Do not migrate automatically. No approved equivalent role exists. |

The legacy frontend currently has no regular `ROOM_USER` role in its management mocks. It must not be inferred from another role.

## Source files containing legacy values

- `src/features/users/data/mockUserManagementData.js`: role labels and mock user memberships.
- `src/features/users/hooks/useUserManagementCapabilities.js`: legacy role hierarchy and capability checks.
- `src/pages/UserManagementPage/UserManagementPage.jsx`: role selectors and permission guide.
- `src/features/superAdmin/services/superAdminService.js`: generated management data using legacy role values.
- `src/features/superAdmin/components/UsersPermissionsTab.jsx`: role filter options.
- `src/store/session.store.js`: a mock current-user role plus `super_admin` view identifiers.
- `src/components/layout/AppShell.jsx`: a role comparison plus `super_admin` navigation identifiers.
- `src/app/AppRoutes.jsx`: `super_admin` view routing; this is not itself a role migration target.
- `src/features/superAdmin/hooks/useSuperAdminScope.js`: `super_admin` view state; this is not itself a role migration target.

Migration must distinguish role fields from navigation IDs. It must reject `environment_admin` for manual resolution rather than silently converting it to `SYSTEM_ADMIN`.

