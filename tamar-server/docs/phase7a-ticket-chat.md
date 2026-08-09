# Phase 7A: Ticket text chat

Phase 7A adds one continuous plain-text message stream to each Ticket. The stream belongs to the Ticket and is never split by Room, Transfer, role or Ticket status.

## Access

A participant must be an active provisioned User who can currently view the Ticket and who retains active Ticket-create authority in at least one active current or historically visible Room. Creator or assignee relationships do not bypass scope authorization.

This means:

- current-Room participants can participate;
- participants in a previous visible Room can continue while their membership and hierarchy remain active;
- destination participants can participate during pending transfer acceptance;
- authorized participants can continue after the Ticket is closed;
- revoked, inactive or unrelated actors cannot read, create, edit or delete messages.

`Ticket.capabilities.isReadOnly` describes workflow mutation authority. `Ticket.capabilities.canWriteChat` is independent. A closed or previous-Room Ticket can therefore be workflow-read-only while remaining chat-writable.

## Ownership and state

Only the author may edit or soft-delete a Message, with no manager or administrator override. Access is rechecked for every operation. Deletion stores a content-null tombstone in the original stream position; deleted content is not copied to another field or collection.

Message creation is idempotent by `(ticketId, authorUserId, clientMessageId)`. Edit and delete use `Message.version` through `If-Match`; chat never changes `Ticket.version` and never writes `TicketHistory`.

## Pagination

The list endpoint returns the newest page but orders its items chronologically for display. The opaque `before` cursor is based on `(createdAt, _id)` and loads older pages. The default limit is 50 and the maximum is 100.

## Realtime

REST is the only write transport. After persistence, Socket.IO publishes `chat:message-created`, `chat:message-updated` and `chat:message-deleted` invalidations to the Ticket System and each active visible Room/SubEnvironment union. Event payloads contain identifiers, version and timestamps, never Message content or private identity data.

## Explicit exclusions

This phase contains no attachments, uploads, internal/private messages, revisions, restore, moderation override, reactions, threads, mentions, search, read receipts, typing state or frontend integration.
