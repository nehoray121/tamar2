# Tamar API Route Map after Phase 8

All Express HTTP entry points are registered by `src/routes/index.js` and are defined in flat route modules directly under `src/routes`.

| Method | Public path | Route file | Controller/handler |
| --- | --- | --- | --- |
| GET | `/api/health` | `health.routes.js` | inline health handler |
| GET | `/api/health/ready` | `health.routes.js` | inline readiness handler |
| GET | `/api/auth/me` | `auth.routes.js` | `authenticatedIdentityService.getAuthenticationState` |
| GET | `/api/access-request-options` | `accessRequestOptions.routes.js` | `accessRequestOptionsService.getOptions` |
| GET | `/api/access-requests/me` | `accessRequests.routes.js` | `accessRequestService.listMine` |
| POST | `/api/access-requests` | `accessRequests.routes.js` | `accessRequestService.submit` |
| GET | `/api/access-requests` | `accessRequests.routes.js` | `accessRequestService.listReviewable` |
| POST | `/api/access-requests/:id/approve` | `accessRequests.routes.js` | `accessRequestService.approve` |
| POST | `/api/access-requests/:id/reject` | `accessRequests.routes.js` | `accessRequestService.reject` |
| POST | `/api/access-requests/:id/cancel` | `accessRequests.routes.js` | `accessRequestService.cancel` |
| GET | `/api/tickets` | `tickets.routes.js` | `TicketController.list` |
| POST | `/api/tickets` | `tickets.routes.js` | `TicketController.create` |
| GET | `/api/tickets/:id` | `tickets.routes.js` | `TicketController.get` |
| PATCH | `/api/tickets/:id` | `tickets.routes.js` | `TicketController.update` |
| POST | `/api/tickets/:id/close` | `tickets.routes.js` | `TicketController.close` |
| GET | `/api/tickets/:id/history` | `tickets.routes.js` | `TicketController.history` |
| POST | `/api/tickets/bulk/assignees` | `ticketAssignments.routes.js` | `TicketAssignmentController.bulk` |
| PUT | `/api/tickets/:id/assignees` | `ticketAssignments.routes.js` | `TicketAssignmentController.replace` |
| GET | `/api/tickets/:id/assignable-users` | `ticketAssignments.routes.js` | `TicketAssignmentController.assignableUsers` |
| GET | `/api/tickets/:id/assignments` | `ticketAssignments.routes.js` | `TicketAssignmentController.assignments` |
| GET | `/api/tickets/:id/messages` | `ticketMessages.routes.js` | `TicketMessageController.list` |
| POST | `/api/tickets/:id/messages` | `ticketMessages.routes.js` | `TicketMessageController.create` |
| PATCH | `/api/tickets/:id/messages/:messageId` | `ticketMessages.routes.js` | `TicketMessageController.edit` |
| DELETE | `/api/tickets/:id/messages/:messageId` | `ticketMessages.routes.js` | `TicketMessageController.delete` |
| GET | `/api/tickets/:id/transfer-targets` | `ticketTransfers.routes.js` | `TicketTransferController.targets` |
| POST | `/api/tickets/:id/transfers` | `ticketTransfers.routes.js` | `TicketTransferController.initiate` |
| GET | `/api/tickets/:id/transfers` | `ticketTransfers.routes.js` | `TicketTransferController.history` |
| GET | `/api/ticket-transfers` | `ticketTransfers.routes.js` | `TicketTransferController.list` |
| GET | `/api/ticket-transfers/:id` | `ticketTransfers.routes.js` | `TicketTransferController.detail` |
| POST | `/api/ticket-transfers/:id/accept` | `ticketTransfers.routes.js` | `TicketTransferController.accept` |
| POST | `/api/ticket-transfers/:id/cancel` | `ticketTransfers.routes.js` | `TicketTransferController.cancel` |

| GET | `/api/rooms/:roomId/boards/:boardType/items` | `ticketBoards.routes.js` | auth + active membership -> `TicketBoardController.listItems` -> `TicketBoardQueryService`; active authority for exact Room |
| GET | `/api/rooms/:roomId/boards/:boardType/categories` | `ticketBoards.routes.js` | auth + active membership -> `TicketBoardController.listCategories` -> `TicketBoardCategoryService`; active authority for exact Room |
| POST | `/api/rooms/:roomId/boards/:boardType/categories` | `ticketBoards.routes.js` | auth + active membership -> `TicketBoardController.createCategory` -> `TicketBoardCategoryService`; ROOM_USER or higher in exact Room |
| PATCH | `/api/rooms/:roomId/boards/:boardType/categories/:categoryId` | `ticketBoards.routes.js` | auth + If-Match -> `TicketBoardController.updateCategory` -> `TicketBoardCategoryService`; exact Room-board scope |
| POST | `/api/rooms/:roomId/boards/:boardType/categories/:categoryId/archive` | `ticketBoards.routes.js` | auth + If-Match -> `TicketBoardController.archiveCategory` -> `TicketBoardCategoryService`; exact Room-board scope |
| GET | `/api/rooms/:roomId/boards/:boardType/items/:itemId/state` | `ticketBoards.routes.js` | auth -> `TicketBoardController.getState` -> `TicketBoardItemStateService`; eligible exact Room-board item |
| PATCH | `/api/rooms/:roomId/boards/:boardType/items/:itemId/state` | `ticketBoards.routes.js` | auth + If-Match -> `TicketBoardController.updateState` -> `TicketBoardItemStateService`; eligible exact Room-board item |
| POST | `/api/environments/:environmentId/sub-environments` | `organizationHierarchy.routes.js` | authenticated exact-System SUPER_ADMIN -> `OrganizationHierarchyMutationService.createSubEnvironment` |
| POST | `/api/sub-environments/:subEnvironmentId/rooms` | `organizationHierarchy.routes.js` | authenticated exact-System SUPER_ADMIN -> `OrganizationHierarchyMutationService.createRoom` |
Socket.IO remains initialized separately and is not part of this HTTP registry.