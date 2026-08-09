# Phase 4 Ticket Core decisions

## Scope

Phase 4 implements only Ticket creation, authorized list/detail views, mutable core-field editing, closure, immutable business history, capabilities and safe realtime invalidation. Assignment workflows, transfers, chat, attachments, categories, pinning, configuration, dashboard calculations, notifications, AuditLog, export, reopen and delete remain deferred.

## Search

Search is a bounded escaped regular-expression contains match over ticketNumber, subject and description. Input is normalized and limited to 100 characters; control characters and unknown query fields are rejected. Callers cannot provide MongoDB operators or raw regular expressions. A future search service or text index may replace this implementation when ranking and language-specific tokenization are required.

## Transactions and delivery

Ticket creation commits sequence allocation, Ticket and TICKET_CREATED history in one MongoDB transaction. Updates and closure commit the Ticket version change and history in one transaction. Socket.IO events are emitted only after commit. Phase 4 intentionally has no outbox; a realtime delivery failure is safely logged and does not roll back a committed API operation.

## Socket authorization

Organization rooms are derived at connection time only from active MongoDB memberships and operational hierarchy. SUPER_ADMIN joins a System room, SYSTEM_ADMIN joins a SubEnvironment room, and ROOM_MANAGER or ROOM_USER joins a Room room. Clients cannot submit room lists and no generic join/subscribe event exists. Events route to the Ticket System, SubEnvironment and current Room. Membership changes require reconnect so rooms are recalculated from current server state.

## Concurrency

PATCH and close require If-Match with the explicit Ticket version. A successful mutation increments version exactly once and returns the new quoted ETag. Missing, malformed and stale preconditions fail without writes.

## History privacy

History contains bounded business-change summaries only. It does not persist access tokens, verified claims, personal-number protection data, request bodies, membership documents, full descriptions or full fieldValues.
