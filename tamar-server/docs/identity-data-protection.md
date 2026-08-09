# Identity Data Protection

## Personal number

Tamar never stores the raw personal number. The verified claim is normalized with Unicode NFKC, trimmed, checked for control characters, length-limited and validated by the configured pattern.

Lookup uses HMAC-SHA-256 with IDENTITY_LOOKUP_HMAC_KEY. The stable digest is hidden by default in Mongoose projections and protected by a unique partial index. Only the last four characters may be stored for masking.

The HMAC key is an operational secret. Store it in an approved secret manager, keep it stable across deployments, restrict access, and define a controlled rotation and re-indexing plan before changing it. Losing or silently changing the key breaks identity correlation.

## External identity binding

The stable provider key and verified subject are unique together. A verified identity can bind to an existing matching unbound user. If personal-number and provider-subject lookups resolve to different users, or an existing binding disagrees, authentication fails closed.

Raw Access Tokens, raw personal numbers, HMAC keys and full verified claim sets are not logged, returned or sent through Socket.IO.

## Data minimization

The authentication response returns a masked personal number, safe user identity, safe membership scope references and effective access identifiers. Internal assignment, revocation and protected lookup fields are omitted.