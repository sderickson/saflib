[**@saflib/vendors-sentry-node**](../../index.md)

---

# ~~Variable: initSentry()~~

> `const` **initSentry**: (`options`) => `void` = `configureSentry`

Wire the error ring buffer and optional Sentry forwarding for Node services.
Idempotent for the buffer collector; Sentry init skips when DSN is missing or `"mock"`.

## Parameters

| Parameter | Type                                                                  |
| --------- | --------------------------------------------------------------------- |
| `options` | [`ConfigureSentryOptions`](../type-aliases/ConfigureSentryOptions.md) |

## Returns

`void`

## Deprecated

Use [configureSentry](../functions/configureSentry.md).
