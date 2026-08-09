# Real-data verification matrix

| ID | Feature | Removed source | Canonical Backend source | Production implementation | Automated evidence | E2E evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RD-01 | Dashboard | `dashboard.mock.js` | `GET /api/dashboard` | `dashboardApi`, `useDashboardData` | real-data verifier and frontend tests | clean-system and explicit-error flows | Implemented |
| RD-02 | User Management | `mockUserManagementData.js`, `mockUserDirectory.js` | `/api/users` | `usersApi`, `useUserManagement` | user/backend tests and architecture test | SUPER_ADMIN user flow | Implemented |
| RD-03 | Hierarchy | `roomHierarchy.mock.js` | `/api/organization/*` | hierarchy API and `useRoomHierarchy` | hierarchy tests | hierarchy selection flow | Implemented |
| RD-04 | Ticket boards | ticket arrays and prototype repository | `/api/ticket-boards/*` | `useTicketBoard` | Phase 8/9 board tests | Phase 9-V | Implemented |
| RD-05 | My Tasks | `legacyMyTasksService.js` | `GET /api/tickets?view=MY_TASKS` | `useMyTasks` | architecture test | real ticket assignment flow | Implemented |
| RD-06 | Ticket details/edit | row placeholders | `GET/PATCH /api/tickets/:id` | `TicketModal`, `ticketsApi` | backend Ticket tests | real ticket flow | Implemented |
| RD-07 | Assignments | local room-user arrays | `/api/tickets/:id/assignees` | assignment service/API | assignment tests | real assignment flow | Implemented |
| RD-08 | Transfers | prototype destination hierarchy | transfer targets and transfer APIs | `SendInquiryView`, `ticketsApi` | Phase 6 tests | transfer flow | Implemented |
| RD-09 | Chat | placeholder conversation | `/api/tickets/:id/messages` | Phase 10 chat modules | Phase 10 tests | Phase 10 E2E | Implemented |
| RD-10 | Categories/pinning | local category state | board category/state APIs | Phase 8/9 modules | board tests | Phase 9-V | Implemented |
| RD-11 | Access Requests | no production screen | `/api/access-requests*` | `accessRequestsApi`, `AccessRequestsPage`, shared realtime subscriber | backend access/realtime tests and architecture test | authenticated access-request flow | Implemented |
| RD-12 | Settings | browser business persistence | `/api/settings/rooms/:roomId` | `settingsApi`, repository | settings/backend tests | settings refresh flow | Implemented |
| RD-13 | Control Center | hardcoded analytics series | `GET /api/control-center` | analytics API modules | backend analytics tests | clean analytics flow | Implemented |
| RD-14 | Authentication | fake session identity | `/api/auth/me` | session store and shared token provider | auth/JWKS tests | local-auth E2E | Implemented |
| RD-15 | Error policy | mock data in failure paths | canonical API error envelope | runtime state panels | static verifier | no-fake-fallback flow | Implemented |
| RD-16 | Safe reset | ad-hoc seed state | guarded `tamar_dev` reset | `scripts/dev-tamar.cjs` | reset guard tests | final clean-state flow | Implemented |

The matrix is validated by `npm run verify:real-data`, which requires this file, validates its canonical route markers and fails on active production mock sources or forbidden business-data fallbacks.
