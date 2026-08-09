# Tamar Server

Standalone Node.js backend for the Tamar React application.

## Current scope

The server includes the Phase 1 runtime foundation, Phase 2A authorization model, Phase 3A canonical organization hierarchy, and Phase 2B organizational Access Token authentication plus authenticated Access Requests.

Phase 2B uses verified bearer Access Tokens only. Tamar does not provide local passwords, a local login endpoint, a fake SSO provider, browser identity headers, or a token minting endpoint.

## Prerequisites

- Node.js 20 or newer.
- npm.
- MongoDB running as a Replica Set.
- Approved organizational identity-provider metadata: issuer, audience, JWKS URI, claim names and asymmetric signing algorithms.
- A secret-manager value for IDENTITY_LOOKUP_HMAC_KEY.
- A separately controlled initial SUPER_ADMIN bootstrap process.

## Environment setup

Copy .env.example to a local .env and replace placeholders with approved values. Never commit .env or secrets. Startup fails closed when authentication configuration is missing or invalid. Production issuer and JWKS URLs must use HTTPS.

## Install and run

    npm install
    npm run dev

Production-style startup:

    npm start

## Authentication

REST clients send the provider Access Token in the Authorization: Bearer header. Socket.IO clients send it only as handshake.auth.accessToken. Query-string tokens are rejected.

The server verifies signature through the configured remote JWKS, issuer, audience, expiration, issued-at time, key identifier and an asymmetric algorithm allowlist. Provider role or group claims are not trusted for Tamar authorization.

Protected endpoints:

- GET /api/auth/me
- GET /api/access-request-options
- GET /api/access-requests/me
- POST /api/access-requests
- GET /api/access-requests
- POST /api/access-requests/:id/approve
- POST /api/access-requests/:id/reject
- POST /api/access-requests/:id/cancel

Only GET /api/health and GET /api/health/ready remain public.

See docs/sso-access-token-phase2b.md, docs/access-request-api-phase2b.md, docs/identity-data-protection.md and docs/super-admin-bootstrap.md.

## Verification

    npm test
    npm run smoke

Tests use only tamar_test while NODE_ENV=test and drop that isolated database at the end. The smoke script uses a local ephemeral JWKS server and signed test Access Token; it does not impersonate a real production provider.

## MongoDB

Development is restricted to the tamar logical database. Test configuration rewrites the target to tamar_test. The application does not create a production user or SUPER_ADMIN automatically.

## Graceful shutdown

SIGINT and SIGTERM stop new HTTP traffic, close Socket.IO, close the HTTP server and disconnect Mongoose. Shutdown is bounded by a timeout.