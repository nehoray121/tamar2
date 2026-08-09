# Initial SUPER_ADMIN Bootstrap

Phase 2B intentionally does not auto-create a production user or SUPER_ADMIN. SUPER_ADMIN cannot be requested through the Access Request API.

Before production activation, establish a separately reviewed bootstrap runbook that:

1. verifies the operator through the approved organizational SSO;
2. records the exact verified provider and subject;
3. computes the protected personal-number lookup through the same server service;
4. creates or binds one active User;
5. assigns one active SUPER_ADMIN membership at the canonical SYSTEM scope;
6. records who approved and executed the action;
7. runs once under change control and is then disabled;
8. confirms no plaintext personal number or token entered logs or persistent storage.

Use an audited administrative mechanism, not an HTTP endpoint exposed by this phase. Define emergency recovery, revocation and key-rotation procedures before production launch.