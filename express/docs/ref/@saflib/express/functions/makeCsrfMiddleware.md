[**@saflib/express**](../../../index.md)

---

# Function: makeCsrfMiddleware()

> **makeCsrfMiddleware**(): `Handler`

Enforce CSRF double-submit token validation on state-changing requests.

Must run after OpenAPI validation has matched an operation (`req.openapi.schema`).
Missing schema on an unsafe method is a misconfiguration (500), not a skip —
otherwise `no-auth` / `csrf-exempt` tags cannot be trusted.

Skips routes tagged `no-auth` (same convention as auth middleware).
Skips `csrf-exempt` for browser-initiated posts that cannot attach our token
(e.g. Content-Security-Policy violation reports).
Skips internal-listener traffic (assertion-authenticated unix socket); CSRF
protects browser cookie sessions, not in-process/service hops.

## Returns

`Handler`
