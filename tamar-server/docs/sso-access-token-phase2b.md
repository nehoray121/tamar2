# Phase 2B SSO Access Token Authentication

## Decision

Tamar is an OAuth 2.0 resource server. It accepts an organizational provider Access Token and validates it against a remote JWKS. Personal number lookup is identity correlation only and is never sufficient authentication.

No authorization code flow, redirect callback, local login, password, refresh-token storage, cookie session, fake provider, token generator, or frontend integration is included in Phase 2B.

## Validation boundary

The server validates:

- strict Bearer syntax for REST;
- Socket.IO handshake.auth.accessToken only;
- maximum token size;
- protected-header kid;
- an explicit asymmetric algorithm allowlist;
- cryptographic signature through the configured JWKS;
- issuer, audience, expiration and issued-at time;
- configured subject, personal-number and display-name claims.

Provider role and group claims are ignored. Tamar roles come only from active OrganizationMembership records and canonical hierarchy checks.

## Authentication states

GET /api/auth/me returns one of:

- AUTHORIZED: active Tamar user with effective memberships;
- ACCESS_REQUEST_PENDING: matching pending request;
- ACCESS_REQUIRED: verified identity without effective access.

A disabled Tamar user receives USER_DISABLED. Identity binding conflicts fail closed.

## Provider integration status

The code path is production-oriented, but real provider verification remains pending until approved issuer, audience, JWKS URI, algorithm and claim values are supplied. The local test identity provider is test-only and cannot be enabled through an application endpoint.