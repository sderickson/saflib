[**@saflib/express**](../index.md)

---

# Function: makeCsrfMiddleware()

> **makeCsrfMiddleware**(): `Handler`

Enforce CSRF double-submit token validation on state-changing requests.
Skips routes tagged `no-auth` (same convention as auth middleware).
Skips `csrf-exempt` for browser-initiated posts that cannot attach our token
(e.g. Content-Security-Policy violation reports).

## Returns

`Handler`
