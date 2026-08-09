# Central API routes

`src/routes/index.js` is the only `/api` registry. Every Express endpoint is defined in a flat module in this directory; controllers, services and repositories do not declare routes.

Ordering is intentional:

1. `ticketBoards.routes.js`
2. `ticketMessages.routes.js`
3. `ticketTransfers.routes.js`
4. `ticketAssignments.routes.js`
5. `tickets.routes.js`

The specialized Message, Transfer and bulk Assignment routes must be mounted before generic Ticket `/:id` routes.

## Phase 7A Message routes

`ticketMessages.routes.js` contains exactly four text-chat entry points:

- `GET /tickets/:id/messages`
- `POST /tickets/:id/messages`
- `PATCH /tickets/:id/messages/:messageId`
- `DELETE /tickets/:id/messages/:messageId`

All four require bearer authentication, a provisioned active Tamar User and an effective active membership. Business authorization, ownership, persistence, concurrency and realtime routing remain in the Message module services.

Message writes use REST only. Socket.IO publishes post-persistence invalidation events and does not accept client Message writes or arbitrary room joins.

## Phase 8 Room Board routes

`ticketBoards.routes.js` is the sole HTTP entry point for the seven shared Room-board endpoints. It exposes Board item listing, category create/list/update/archive and item-state get/update for `OPEN`, `CLOSED`, `EXTERNAL_SENT` and `EXTERNAL_RECEIVED`. REST is the write source of truth; Socket.IO only distributes post-persistence invalidation events.