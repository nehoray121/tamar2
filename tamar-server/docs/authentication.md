# Tamar authentication contract

## Confirmed direction

Tamar uses organizational single sign-on. Tamar does not own passwords and will not implement local registration, password login, password hashing, password recovery, security questions, or a hardcoded production identity.

The organizational identity provider authenticates the person. Tamar authorizes the authenticated person through active MongoDB users and organizational memberships.

REST and Socket.IO must resolve the same authenticated identity. Internal users will be matched by the stable pair `provider` and `subject`, not by display name, email address, or another mutable username.

The exact SSO protocol has not been selected. Phase 1 does not contain executable identity middleware, SSO callbacks, sessions, JWT handling, or trusted identity headers.

## Planned Phase 2 abstractions

```text
resolveHttpIdentity(req)
resolveSocketIdentity(socket)
normalizeIdentityClaims(identity)
findAuthorizedTamarUser(identity)
```

Arbitrary browser-controlled headers such as `x-user-id`, `x-user-email`, and `x-user-role` must never be trusted. A future reverse-proxy integration may use identity headers only after an explicitly approved design verifies that requests came from the trusted proxy and that untrusted clients cannot bypass it.

## Required Phase 2 decisions

- SSO protocol: OpenID Connect, SAML, ADFS, Microsoft Entra ID, trusted reverse proxy, or another approved protocol.
- Identity provider and trusted issuer or proxy boundary.
- Audience or client ID where applicable.
- Stable subject claim and provider identifier.
- Display-name claim.
- Email claim.
- Whether organizational group claims are required.
- Session or token handling model shared by HTTP and Socket.IO.
- Logout behavior and identity-provider logout requirements.
- Session lifetime and renewal behavior.
- Deployment topology and approved origins.
- Whether Tamar runs in an online or closed organizational network.
- Behavior for an authenticated identity that has no active Tamar user or membership.

