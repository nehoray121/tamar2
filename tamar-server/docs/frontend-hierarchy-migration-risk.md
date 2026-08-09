# Frontend hierarchy and canonical-ID migration risk

The Phase 3A backend was implemented without changing the frontend. Existing frontend identifiers are not MongoDB ObjectIds and must not be silently copied into canonical references.

## Sources found

- `src/features/rooms/data/roomHierarchy.mock.js` uses small numeric IDs (`1` through `5`) for SubEnvironments and Rooms.
- `src/features/rooms/hooks/useRoomHierarchy.js` creates hierarchy IDs with `Date.now()` and compares mixed values using string coercion.
- `src/features/users/data/mockUserDirectory.js` uses readable string IDs such as `technology`, `ops`, `manday`, `networks` and `service`.
- `src/features/users/data/mockUserManagementData.js` stores user assignments using those readable environment, SubEnvironment and Room IDs.
- `src/features/settings/constants/settingsDefaults.js` stores the settings Room identifier `manday`.
- `src/features/superAdmin/services/superAdminService.js` derives IDs such as `env-productivity`, `sub-1` and `room-1` from multiple mock sources.
- Settings field cloning also uses `Math.random()`, but those field IDs are not organization IDs and must be migrated separately in a later settings phase.

## Required future migration

A Phase 3B migration must create an explicit mapping table from every legacy ID to a canonical MongoDB ObjectId. Mapping must be based on reviewed business identity and parent lineage, not display name alone.

The migration must cover hierarchy data, settings Room keys, user assignments and any inquiry records that reference legacy Rooms. Duplicate display names and mixed numeric/string representations require manual conflict handling.

`manday` may be retained as a normalized Room `key`, but the internal `roomId` must become the Room ObjectId. Numeric IDs, `Date.now()` IDs and generated `env-`/`sub-`/`room-` values must never be treated as ObjectIds.

No frontend data was migrated or rewritten during Phase 3A.
