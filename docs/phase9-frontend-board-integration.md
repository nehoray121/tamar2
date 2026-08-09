# Phase 9 - Frontend Room Board integration

## Scope

Phase 9 connects the existing Tamar inquiry lists to the canonical Phase 8 Room Board API. It does not add chat, attachments, notifications, personal ordering, a new board screen, or any Backend endpoint.

The canonical Backend contract remains:

- `tamar-server/docs/openapi/tickets-phase8-boards.yaml`
- `tamar-server/docs/api-route-map.md`

## Canonical board mapping

| Existing UI | Board type |
| --- | --- |
| Open inquiries | `OPEN` |
| Inquiry history / closed inquiries | `CLOSED` |
| External inquiries - sent | `EXTERNAL_SENT` |
| External inquiries - received | `EXTERNAL_RECEIVED` |

`resolveBoardTypeFromView` is the only UI-to-Board resolver. Unknown views fail safely and are never silently mapped to an external board.

## Identity and isolation

- `OPEN` and `CLOSED`: `boardItemId = ticket.id`.
- `EXTERNAL_SENT` and `EXTERNAL_RECEIVED`: `boardItemId = transfer.id`.
- External rows also retain `ticketId` and `transferId` separately.
- React row identity is `boardType + ":" + boardItemId`.
- Board requests are isolated by `roomId`, `boardType`, query, sort and page.
- Item state is isolated by `roomId`, `boardType` and `boardItemId`.
- Categories are loaded only for the active Room and Board.

This preserves independent state for OPEN versus CLOSED, sent versus received, different Rooms, and multiple transfers of one Ticket.

## Room context

The hook uses only the selected hierarchy Room when it contains a canonical MongoDB ObjectId in `backendId` or `id`. Production Board loading has no environment-variable Room fallback. Missing canonical Room context fails visibly and never falls back to mock Board data. The Phase 9-V E2E harness initializes the real session store with a canonical Room DTO seeded in `tamar_test`.

`My Tasks` has no Phase 8 Board endpoint. It retains a narrow legacy task-list source without category, pin or personal-order mutations. This source is not used by any of the four Room Boards.

## Authenticated API client

All REST operations use one authenticated client and the exact seven Phase 8 endpoints. The client sends `Authorization: Bearer <access-token>`, supports `AbortSignal`, parses the success/error envelope, captures `ETag`, and fails closed when a valid token is unavailable.

The existing frontend had no approved SSO adapter. The host SSO integration must expose `globalThis.__TAMAR_AUTH__.getAccessToken()` or call `configureAccessTokenProvider(provider)` during application bootstrap. There is no runtime fake token, local JWT, personal-number header, role header, or `localStorage` token fallback.

Configuration is non-secret:

- `VITE_API_BASE_URL`: optional API base; an empty value uses same-origin `/api`.
- `VITE_SOCKET_URL`: optional Socket.IO origin; an empty value uses the frontend origin.
- `VITE_API_PROXY_TARGET`: Vite development proxy target, default `http://127.0.0.1:4000`.

## Server query state

Search, priority, category mode/category ID, pin mode, sort and pagination are sent to the Board list endpoint. Unsupported filters are dropped by a per-Board allowlist. The UI does not filter or reorder a server page after it arrives. Pinned-first ordering and pagination totals come from the Backend.

Changing Room or Board aborts prior requests, clears the previous scoped catalog and rows, resets category selection, and ignores late responses through a request sequence guard.

## Category lifecycle

- Active categories are fetched from the active Room and Board catalog.
- Create sends only `name`, optional `description` and optional `color`.
- Update uses the current opaque Category ETag, or the quoted `categoryVersion` fallback.
- Archive uses the Category version domain and has no restore or hard-delete UI.
- The archive confirmation explains that existing references remain and new assignment is disabled.
- Archived category summaries returned on Board items remain visible with a muted `בארכיון` label and can be removed.
- Archived categories are not offered for assignment.
- Dialog content remains available after validation, authorization, duplicate-name or version errors.

## Shared pin and item state

Category assignment/removal and pin/unpin mutate Board item state only. Every request sends that row's `boardStateEtag`, or quoted `boardStateVersion`. A virtual state is explicitly represented by `boardStateVersion = 0` and sends `If-Match: "0"`.

Ticket, Transfer and Category versions are never used for Board-state mutation. Read-only pinned state remains visible while mutation controls are disabled according to Backend capabilities.

## Conflict recovery

For `BOARD_STATE_VERSION_CONFLICT`, `BOARD_CATEGORY_VERSION_CONFLICT` and `PRECONDITION_REQUIRED`, the UI refetches server truth and shows a safe Hebrew error. A single item operation retains an explicit retry action. Category forms remain open with the intended values. No failed operation claims success.

Eligibility/not-found/archive failures also refresh the active Board where applicable.

## Bulk behavior

There is no undocumented bulk endpoint. Existing bulk category and pin actions execute item-state PATCH requests with each selected row's own identity and version. Concurrency is bounded to four requests. Progress, successes, failures and conflicts are reported; failed IDs remain selected for retry. The operation is non-atomic and the Board is refetched once after completion.

## Capabilities

`canChangeCategory` and `canChangePin` come from the Board API. They control presentation only; Backend authorization remains authoritative. No frontend role-name check replaces the capabilities.

## Realtime

The authenticated Socket.IO client listens only for invalidation:

- `board:category-created`
- `board:category-updated`
- `board:category-archived`
- `board:item-state-updated`
- relevant Ticket and Transfer lifecycle events

Board events must match both `roomId` and `boardType`. Workflow events must affect the active Room and an eligible Board. Bursts are coalesced for 180 ms, reconnect triggers a REST refresh, and all listeners/timers are removed on cleanup. Socket.IO never performs a Board write and realtime payloads are never treated as full state.

## Loading, error and accessibility behavior

- Initial loading, background refreshing, empty filters and request errors are distinct states.
- Conflict and manual refresh actions are available in Hebrew.
- Pin controls expose `aria-pressed` and a shared-Room tooltip.
- Category dialogs use `role="dialog"`, restore focus, announce errors and retain RTL behavior.
- Long category names are truncated without relying on color as the only identifier.

## Tests

Focused Node tests cover:

- all four Board mappings;
- Ticket versus Transfer identity and stable row keys;
- per-Board query allowlists and removal of personal-order fields;
- Bearer authentication, fail-closed token behavior, safe errors, ETag and AbortSignal;
- exact Phase 8 routes and `If-Match` headers;
- virtual version 0 followed by category/pin version advancement;
- sent/received Room isolation and multiple Transfer IDs;
- Room/Board realtime invalidation matching.

Phase 9-V adds a focused Playwright harness that runs the real React UI against the real Backend with a signed test Access Token, remote JWKS validation, canonical `tamar_test` ObjectIds and authenticated Socket.IO clients. The harness is test-only and does not add a runtime fake token or production login path.

## Files

Phase 9 adds the focused `src/features/tickets/boards` API/domain/hook/realtime modules and tests, plus `legacyMyTasksService.js`. It updates the existing Ticket list, category, pin, bulk, close-dialog and session-context components, Vite development proxy, package metadata and this document.

The only added package is production dependency `socket.io-client`, required to consume the already approved authenticated Socket.IO server. Backend production source, routes, models and package files are unchanged.

## Explicit non-goals

No Phase 10 work, chat UI, attachments, uploads, notifications, arbitrary Socket joins, Socket writes, Backend bulk route, personal categories, personal pins, personal ordering, global Ticket category/pin, settings redesign, dashboard redesign, SLA or export was implemented.
