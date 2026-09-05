[**@saflib/vendors-posthog**](../../index.md)

---

# Function: configureAnalytics()

> **configureAnalytics**(): `void`

Initializes the process-level analytics client from PostHog env
(`POSTHOG_PROJECT_API_KEY`, `POSTHOG_PROJECT_HOST`).
Uses in-memory when the key is missing/`mock`, or when `NODE_ENV` is `test`.
Idempotent — subsequent calls are no-ops.

## Returns

`void`
