# Phase 6 - Ticket Transfers

## Scope

Phase 6 implements authenticated, sequential ownership transfer of an OPEN Ticket between active Rooms in the same System. It does not connect the React frontend and does not add chat, attachments, categories, pinning, notifications or a sender-recall flow.

## Ownership lifecycle

- Initiation immediately changes `Ticket.currentRoomId` and its Environment/SubEnvironment lineage to the destination Room.
- `Ticket.activeTransferId` points to the one `PENDING_ACCEPTANCE` Transfer.
- Both source and destination remain in the deduplicated `visibleRoomIds` history.
- Source and earlier Rooms retain read-only historical visibility.
- Destination managers may accept or cancel; destination Room users may inspect but cannot resolve.
- Acceptance clears `activeTransferId` and activates ordinary destination ownership authority.
- Cancellation clears `activeTransferId` and restores the immediate source Room, not `originalRoomId`.
- Transfer records are terminal and immutable after `ACCEPTED` or `CANCELLED`.

## Assignment behavior

All active assignments end atomically when initiation commits with `endedReason=TICKET_TRANSFERRED`. The Ticket projection becomes empty. Acceptance and cancellation never reactivate historical assignments.

## Consistency

Initiation and resolution run inside MongoDB transactions. Ticket version checks, the partial unique pending-transfer index, the unique Ticket/sequence index and conditional repository updates protect against duplicate or stale writers. History is appended in the same transaction. Realtime invalidation is published only after commit; no Event Outbox is introduced in this phase, so clients must reconnect and refetch after transport failure.

## Visibility and queues

`OPEN` excludes Tickets while a Transfer is pending. Historical `MY_TASKS` and `HISTORY` use `visibleRoomIds`. Transfer queues are server-filtered as incoming, outgoing or both from effective Room/System access. List and detail DTOs expose safe user and Room summaries only.

## Realtime

Transfer invalidation events are emitted to server-derived System, source/destination SubEnvironment and source/destination Room channels. Payloads contain routing identifiers, status, version and timestamps only; reasons, Ticket body, SSO claims and personal identifiers are excluded.

## API

- `POST /api/tickets/:id/transfers`
- `GET /api/tickets/:id/transfers`
- `GET /api/tickets/:id/transfer-targets`
- `GET /api/ticket-transfers`
- `GET /api/ticket-transfers/:id`
- `POST /api/ticket-transfers/:id/accept`
- `POST /api/ticket-transfers/:id/cancel`

The complete OpenAPI 3.1 contract is in `docs/openapi/tickets-phase6-transfers.yaml`.
