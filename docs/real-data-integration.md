# Tamar real-data integration

## Source-of-truth policy

MongoDB, accessed only through the authenticated Tamar Backend, is the production source of truth for users, memberships, hierarchy, tickets, assignments, transfers, messages, board categories and pinning, access requests, shared settings and analytics. React owns presentation state, request state and short-lived form state only.

API failures render an explicit loading, authentication, authorization, network or retry state. They never activate sample users, tickets, chart series or hierarchy records.

## Browser-local state

Only intentionally local UI state remains in browser storage:

- Theme preference.
- Dashboard KPI layout preference.
- A New Inquiry draft, keyed by the authenticated user and selected room.
- Safe selected hierarchy identifiers in session storage.

None of these stores is authoritative business data.

## Canonical feature sources

| Feature | Production source |
| --- | --- |
| Current user and capabilities | `GET /api/auth/me` |
| Organization hierarchy | `/api/organization/*` |
| Dashboard and Control Center | `GET /api/dashboard` and `GET /api/control-center` MongoDB aggregations |
| Users and memberships | `/api/users/*` |
| Tickets and My Tasks | `/api/tickets*` and `/api/ticket-boards/*` |
| Assignments | `/api/tickets/:id/assignees` |
| Transfers | `/api/tickets/:id/transfers` and `/api/ticket-transfers/*` |
| Chat | `/api/tickets/:id/messages` |
| Categories and pinning | `/api/ticket-boards/*` |
| Access requests | `/api/access-requests*` |
| Shared room settings | `/api/settings/rooms/:roomId` |

## Dashboard metric definitions

- Total inquiries: tickets in the authorized hierarchy and selected date range.
- Open inquiries: tickets whose canonical status is `OPEN`.
- Overdue inquiries: open tickets whose configured SLA deadline has elapsed.
- Urgent open inquiries: open tickets with `CRITICAL` or `HIGH` priority.
- Unassigned inquiries: open tickets without an active assignment.
- Recently handled: tickets closed in the selected date range.
- Average handling time: average elapsed time from `createdAt` to `closedAt` for closed tickets in scope.
- Trend: backend date buckets over created and closed ticket timestamps.
- Urgency distribution: backend grouping by canonical priority.
- Operator workload: active assignments grouped by persisted user.
- Requires attention: backend-defined overdue, urgent or unassigned open tickets.

When no records exist, numeric metrics are zero and collection/chart responses are empty. A failed request remains an error and is not represented as a successful empty response.

## Settings classification

- Theme and Dashboard layout are UI-only preferences stored locally.
- New Inquiry drafts are temporary user form state stored locally.
- Field definitions, display layout, templates and general room behavior are shared room settings persisted through the Backend.
- Authentication issuer, database and local-development flags are development/runtime configuration and are never stored as organization settings.

## Realtime

REST is the only write channel. The shared authenticated Socket.IO client receives scoped invalidation events and coalesces refreshes for boards, Dashboard, My Tasks, Chat and Access Requests. Access-request events invalidate reviewer lists and refresh the authenticated permission context. No second Socket.IO client or Socket-based business write path is used.

## Safe database separation and reset

- `tamar_dev`: local development only. Reset with `npm run dev:tamar:reset-data`, which requires development mode, the exact database name and explicit confirmation.
- `tamar_test`: disposable automated-test database only.
- `tamar`: production database. Never reset or mutated by development/test commands.

The development reset creates only one System, one Environment, one SubEnvironment, Room A, Room B, Room C, the protected local identity for `1234567`, and one active `SUPER_ADMIN` membership. It does not store the raw personal number or create business records.

## No-fake-fallback policy

Production source may not import mock/test fixtures, persist business collections to browser storage, generate business identifiers with `Math.random`/`Date.now`, or replace API errors with hardcoded successful data. `npm run verify:real-data` enforces these boundaries.
