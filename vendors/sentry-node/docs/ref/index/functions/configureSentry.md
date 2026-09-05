[**@saflib/vendors-sentry-node**](../../index.md)

---

# Function: configureSentry()

> **configureSentry**(`options`): `void`

Wire Sentry as the process-level error service when `SENTRY_DSN` is set.
Skips when the DSN is missing or `"mock"`. Idempotent — subsequent calls are no-ops.

For local development, use `@saflib/errors-service` `configureMockErrors()` instead.

## Parameters

| Parameter | Type                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `options` | [`SentryErrorServiceOptions`](../type-aliases/SentryErrorServiceOptions.md) |

## Returns

`void`
