[**@saflib/vendors-posthog-client**](../../index.md)

---

# Function: initPostHogIfConfigured()

> **initPostHogIfConfigured**(): `void`

Optional PostHog init when `VITE_POSTHOG_PROJECT_API_KEY` is set at build time.

Product events reach PostHog through @saflib/vue's
commonEventLogger, which calls `globalThis.posthog.capture` when the
client is loaded. Call this once from your SPA `main.ts` (or use
makePosthogScriptTag in Vite HTML instead).

## Returns

`void`
