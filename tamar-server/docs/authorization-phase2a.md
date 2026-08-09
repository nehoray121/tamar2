# Tamar Phase 2A authorization foundation

Phase 2A defines internal authorization data and policy only. It does not authenticate a caller and mounts no business routes.

## Confirmed roles and scopes

| Role | Scope | Requestable |
| --- | --- | --- |
| `SUPER_ADMIN` | `SYSTEM` | No |
| `SYSTEM_ADMIN` | `SUB_ENVIRONMENT` | Yes |
| `ROOM_MANAGER` | `ROOM` | Yes |
| `ROOM_USER` | `ROOM` | Yes |

`SYSTEM_ADMIN` means manager of one or more sub-environments. There is no environment-administrator role and no fifth placeholder role.

## Access Request is not registration

An Access Request records a request for an organizational membership after organizational SSO has authenticated the identity. It does not create credentials, passwords, sessions or a trusted identity. The internal model permits a temporary identity snapshot before the matching internal `User` exists, but approval cannot create a membership until the requester has been provisioned as an active internal user.

No Access Request, membership, user-management or `/api/auth/me` route is mounted during Phase 2A.

## Approval matrix

| Requested role | Authorized reviewer |
| --- | --- |
| `ROOM_USER` | `ROOM_MANAGER` for the same room, parent `SYSTEM_ADMIN`, or `SUPER_ADMIN` |
| `ROOM_MANAGER` | Parent `SYSTEM_ADMIN` or `SUPER_ADMIN` |
| `SYSTEM_ADMIN` | `SUPER_ADMIN` only |
| `SUPER_ADMIN` | Never available through Access Request |

Approval may retain the requested role or lower it. Lowering `SYSTEM_ADMIN` to a room role requires an explicit active room inside the requested sub-environment. A room-scoped request cannot be moved to another room. Phase 2A deliberately rejects role upgrades through Access Request.

## Hierarchy integrity

The internal services require a hierarchy repository to resolve active systems, environments, sub-environments and rooms. They compare the submitted chain with canonical server-side entities before creating a request or membership.

Hierarchy collections are intentionally not created in Phase 2A. A real repository backed by the Phase 3 organization models must be injected before these services can be activated. Browser-provided hierarchy IDs are never sufficient on their own.

## Membership lifecycle

Active duplicate memberships are prevented by a partial unique index over user, role, scope type and scope. Revocation is a soft operation with reviewer and timestamp metadata. Revoked memberships remain as history and grant no access.

## SUPER_ADMIN assignment and bootstrap

`SUPER_ADMIN` assignment is separated into a protected service and is never accepted by Access Request. The service requires an already active `SUPER_ADMIN`. It is not exposed by a route in Phase 2A.

The first production `SUPER_ADMIN` must be provisioned by a controlled administrative script or approved migration after the real SSO provider and stable identity claims are known. No bootstrap user is created by application source.

## Phase 2B prerequisites

- Exact SSO protocol and identity provider.
- Trusted issuer or trusted reverse proxy.
- Audience or client ID where applicable.
- Stable subject, display-name and email claim mappings.
- Group-claim requirements.
- Session or token validation model and lifetime.
- Logout behavior.
- Deployment topology and closed-network assumptions.
- Handling of authenticated identities that are not authorized in Tamar.
- Authenticated Socket.IO identity resolution using the same identity as REST.

