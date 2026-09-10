[**@saflib/vendors-sentry-node**](../../index.md)

---

# ~~Variable: initSentry()~~

> `const` **initSentry**: (`options`) => `void` = `configureSentry`

Wire Sentry as the process-level error service when `SENTRY_DSN` is set.
Skips when the DSN is missing or `"mock"`. Idempotent — subsequent calls are no-ops.

For local development, use `@saflib/errors-service` `configureMockErrors()` instead.

## Parameters

| Parameter | Type                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `options` | [`SentryErrorServiceOptions`](../type-aliases/SentryErrorServiceOptions.md) |

## Returns

`void`

## Deprecated

Use [configureSentry](../functions/configureSentry.md).
