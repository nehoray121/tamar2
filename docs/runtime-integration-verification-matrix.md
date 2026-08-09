# Runtime Integration Verification Matrix

| # | Acceptance criterion | Implementation evidence | Executable evidence | Result |
|---:|---|---|---|---|
| 1 | Root cause identified rather than hidden | `src/store/session.store.js`, `src/features/rooms/services/runtimeOrganizationApi.js`, `src/features/tickets/boards/domain/inquiryRuntimeState.js` | `RTI-E2E-008` through `RTI-E2E-012` | PASS |
| 2 | Canonical Backend Room ObjectId | Runtime hierarchy normalizes the Backend `id` as both `id` and `backendId`; session accepts only hierarchy members | `RTI-E2E-008`, runtime integration unit tests | PASS |
| 3 | No Production `VITE_TAMAR_ROOM_ID` truth | Board enablement derives only from the selected canonical Room | Architecture/static searches | PASS |
| 4 | Missing authentication is not a Room error | Authentication state has higher precedence than organizational context | `RTI-E2E-010` | PASS |
| 5 | API failure is not an empty Board | Initial API failure maps exclusively to `api_error` | `RTI-E2E-011` | PASS |
| 6 | Missing Room is not an empty Board | Missing canonical Room maps exclusively to `context_error`; no Board request starts | `RTI-E2E-009` | PASS |
| 7 | Empty UI only after successful zero-item response | `loaded` must be true, with no blocking error and zero items | `RTI-E2E-012`, runtime-state unit tests | PASS |
| 8 | Filtered empty is distinct | `filtered_empty` is separate from global `empty` | `RTI-E2E-012` | PASS |
| 9 | Retry performs a real action | Auth retry reinitializes runtime, Room retry navigates to hierarchy, Board retry refreshes the active query | `RTI-E2E-011` | PASS |
| 10 | Retry creates no duplicate request | Active request deduplication plus the initial Socket-connect correction | `RTI-E2E-011`, Socket unit tests | PASS |
| 11 | Room switching is race-safe | Abort controllers and request sequence guards | `P9V-E2E-005` | PASS |
| 12 | Board switching is race-safe | Query-scoped request sequence guards | `P9V-E2E-005` | PASS |
| 13 | Stale response cannot overwrite current context | State commits require the current sequence | `P9V-E2E-005`, hook unit tests | PASS |
| 14 | OPEN uses the canonical endpoint | Single `ticketBoardsApi` client | `P9V-E2E-001`, `P9V-E2E-004` | PASS |
| 15 | CLOSED uses the canonical endpoint | Board type remains part of the API path and state key | `P9V-E2E-004` | PASS |
| 16 | EXTERNAL_SENT uses the canonical endpoint | Board type remains part of the API path and state key | `P9V-E2E-004` | PASS |
| 17 | EXTERNAL_RECEIVED uses the canonical endpoint | Board type remains part of the API path and state key | `P9V-E2E-004` | PASS |
| 18 | External Boards use Transfer IDs | Existing Phase 9 mapping preserved | `P9V-E2E-004` | PASS |
| 19 | Room categories do not leak | Room and Board are both part of request/cache context | `P9V-E2E-005` | PASS |
| 20 | Board categories do not leak | Board type remains isolated | `P9V-E2E-002`, `P9V-E2E-004` | PASS |
| 21 | Socket reconnect is safe | First connection does not refresh; an actual reconnect schedules one scoped refresh | `P9V-E2E-006`, Socket unit tests | PASS |
| 22 | Socket listeners do not duplicate | Every subscribed handler is removed; the shared client disconnects at zero subscribers | `P9V-E2E-006`, Socket unit tests | PASS |
| 23 | REST is the only Board write path | Socket handles invalidation only | Static architecture tests | PASS |
| 24 | No fake authentication | Runtime uses the approved Access Token adapter and `/api/auth/me` | Static search, authenticated E2E | PASS |
| 25 | No personal-number authentication | No frontend authentication use of personal numbers | Static search | PASS |
| 26 | No mock Board fallback | Board API failures remain visible failures | Static search, `RTI-E2E-011` | PASS |
| 27 | Dashboard work preserved | No Dashboard source file was edited by this pass | Root Git comparison and task file inventory | PASS |
| 28 | Major routes audited | Dashboard, creation, tasks, settings, users, hierarchy, four Boards, details, forbidden and fallback | `RTI-E2E-013` | PASS |
| 29 | Discovered regressions fixed or documented | Duplicate initial Socket refresh and favicon 404 were fixed; pre-existing prototype mocks documented | Unit/E2E and final report | PASS |
| 30 | Frontend tests | 56/56 | `npm test` | PASS |
| 31 | Browser/integration tests | 13/13 | Playwright Phase 9-V/RTI harness | PASS |
| 32 | Frontend production build | Build completed; only the existing large-chunk warning remains | `npm run build` | PASS |
| 33 | Backend tests | 353/353 | `npm test` in `tamar-server` | PASS |
| 34 | Backend architecture and syntax | 187 CommonJS files; central route registry and canonical bulk route | `npm run verify:architecture`, `node --check` | PASS |
| 35 | Backend smoke | Isolated temporary MongoDB replica set; health, readiness, CORS, JWT/JWKS, Socket.IO and shutdown | `npm run smoke` | PASS |
| 36 | Production data unchanged | E2E used `tamar_test`; smoke used an isolated MongoDB instance; Production inspection was read-only | Read-only MongoDB inspection | PASS |
| 37 | No nested Git repository | Root-only `.git` scan | Filesystem verification | PASS |
| 38 | No new business phase | Only runtime integration, state handling, regression tests and documentation were added | File inventory | PASS |

