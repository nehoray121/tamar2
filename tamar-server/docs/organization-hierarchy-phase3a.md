# Tamar Phase 3A canonical organization hierarchy

Phase 3A adds the internal MongoDB hierarchy used by authorization. It mounts no organization routes and creates no production seed data.

## Canonical model

`System -> Environment -> SubEnvironment -> Room`

MongoDB ObjectIds are canonical internal identifiers. Normalized `key` values are stable business identifiers and are unique only at their documented parent boundary. Display names are never identifiers.

| Entity | Parent | Scoped unique key |
| --- | --- | --- |
| System | none | `key` |
| Environment | System | `systemId + key` |
| SubEnvironment | Environment | `environmentId + key` |
| Room | SubEnvironment | `subEnvironmentId + key` |

The hierarchy supports multiple Systems without adding a separate tenant concept.

## Parent-chain integrity

All creation and authorization services resolve parents from MongoDB. Submitted lineage IDs are compared with canonical references. Active children require a complete active parent chain. Archived parents cannot receive children, including inactive children.

The organization models retain lineage IDs for focused queries, while `OrganizationIntegrityService` rejects mismatches instead of trusting duplicate IDs.

## Lifecycle and archive

- Active: `isActive=true` and `archivedAt` is absent. The entity may be used when every parent is also operational.
- Inactive: retained and visible to future authorized administration, but grants no operational access and cannot receive active children.
- Archived: `isActive=false` with `archivedAt` and `archivedBy`. It is excluded from normal operation and retained for historical references.

Parent state is evaluated dynamically. Deactivation does not rewrite descendants or delete memberships. Reactivation restores effective access when the remaining chain is valid. Archive is soft, never cascades automatically, and is blocked while direct active children exist. Ticket-related archive restrictions are deferred until ticket models exist.

## Role mapping

| Role | Organization scope |
| --- | --- |
| `SUPER_ADMIN` | one `System` |
| `SYSTEM_ADMIN` | one `SubEnvironment` plus active descendant Rooms |
| `ROOM_MANAGER` | one active `Room` |
| `ROOM_USER` | one active `Room` |

There is no `ENVIRONMENT_ADMIN` role. Deprecated frontend role strings are not accepted by backend models or services.

## MongoHierarchyAdapter

`MongoHierarchyAdapter` is the single production MongoDB implementation of the Phase 2A hierarchy contract. It supplies canonical lineage resolution, active-scope checks, parent membership checks and descendant Room lookup. Phase 2A in-memory fixtures remain test-only.

`ScopeResolver` now filters each stored membership through the adapter. Missing, inactive, archived or inconsistent scopes remain stored as history but grant no effective access.

## Service boundaries

- Repositories contain MongoDB queries and focused indexes.
- `OrganizationIntegrityService` validates ObjectIds, parent existence, lineage and operational state.
- `OrganizationHierarchyService` resolves lineage and descendants.
- `OrganizationManagementService` creates and updates entities using explicit field allowlists.
- `OrganizationLifecycleService` deactivates, reactivates and safely archives entities.
- Authorization, membership and Access Request services use `HierarchyIntegrityService`, backed by `MongoHierarchyAdapter`.

No MongoDB hierarchy query is placed in an authorization policy file.

## Deferred activation

No `/api/systems`, `/api/environments`, `/api/sub-environments` or `/api/rooms` route is mounted. Authentication, SSO, authenticated administrative routes and Socket.IO identity are Phase 2B dependencies. Frontend hierarchy migration and room/settings integration are Phase 3B work.
