# Phase 9-V authenticated E2E harness

## Purpose

The harness starts the real React application, real Tamar Backend, a local remote JWKS endpoint, authenticated Socket.IO clients and isolated MongoDB fixtures. It verifies the retained Phase 9 Board implementation without introducing a production login or token fallback.

## Authentication path

- A test-only RSA key signs short-lived Access Tokens.
- The Backend validates the tokens through its real remote JWKS resource-server path.
- The browser receives a token provider through `globalThis.__TAMAR_AUTH__` before React starts.
- Tokens are never committed, written to browser storage, printed in evidence or embedded in the production bundle.
- MongoDB User identity bindings and active memberships remain the source of authorization.

## Canonical organization context

The fixture seeds a real System, Environment, SubEnvironment and Rooms A, B and C in `tamar_test`. The browser initializes the actual Zustand session store with the selected Room DTO and its canonical MongoDB ObjectId. Production Board loading no longer reads `VITE_TAMAR_ROOM_ID`.

## Boards and mutations

The seven browser tests cover OPEN, CLOSED, EXTERNAL_SENT, EXTERNAL_RECEIVED, A to B to C Transfer identity, category create/update/archive, category assignment/removal, shared pin/unpin, virtual state version 0, real ETags and If-Match, conflicts, eligibility changes, races, bounded bulk partial success, two-client Socket.IO invalidation, reconnect and coalescing.

## Commands

- `npm test`
- `npm run test:e2e:phase9v`
- `npm run build`
- Backend: `npm test`
- Backend: `npm run verify:architecture`
- Backend: `npm run smoke`

## Production safety

`mongosh read-only Production count inspection` means listing databases and collection counts without any insert, update, delete, seed or migration against `tamar`. Only `tamar_test` is cleared or dropped by the harness. The final run confirms `tamar_test` is absent after teardown.

## Repository safety

`nested Git repository inspection` searches beneath the React root and confirms there is no nested `.git` directory other than the root repository metadata. No Git initialization, reset, restore, clean or commit is performed.

## Process cleanup

`child process and port cleanup inspection` confirms the harness closed browser contexts, Edge, Vite, Backend HTTP, Socket.IO, JWKS and MongoDB connections. The harness uses isolated available ports and owns only the processes it starts.