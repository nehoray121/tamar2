# Phase 2B Access Request API

All routes require a verified organizational Access Token.

## Routes

- GET /api/access-request-options: active canonical hierarchy choices.
- GET /api/access-requests/me: requests belonging to the verified identity.
- POST /api/access-requests: create an initial or additional access request.
- GET /api/access-requests: reviewable queue for an active authorized reviewer.
- POST /api/access-requests/:id/approve: approve as submitted or with a permitted lower role.
- POST /api/access-requests/:id/reject: reject a pending request.
- POST /api/access-requests/:id/cancel: requester cancels an owned pending request.

Unknown body and query properties are rejected.

## Requestable roles

- ROOM_USER requires ROOM scope.
- ROOM_MANAGER requires ROOM scope.
- SYSTEM_ADMIN requires SUB_ENVIRONMENT scope.
- SUPER_ADMIN is never requestable.
- No ENVIRONMENT_ADMIN role exists.

Every request is validated against the active System, Environment, SubEnvironment and optional Room relationship. Duplicate active membership and equivalent pending requests are rejected.

## Approval policy

- ROOM_USER: authorized ROOM_MANAGER for that room, parent SYSTEM_ADMIN, or SUPER_ADMIN.
- ROOM_MANAGER: parent SYSTEM_ADMIN or SUPER_ADMIN.
- SYSTEM_ADMIN: SUPER_ADMIN only.

A reviewer can lower the role but cannot upgrade it or exceed their authority. Changing SYSTEM_ADMIN to a room role requires an explicit active room in the approved hierarchy.

Approval is transactional: policy is re-evaluated, the user identity is provisioned or bound, membership is created, and the request decision is stored in one MongoDB transaction. Realtime notifications occur only after the operation completes.

## Realtime

Requester events are emitted only to server-controlled identity and user rooms:

- access-request:created
- access-request:updated
- permissions:updated

No client-controlled generic room join exists.