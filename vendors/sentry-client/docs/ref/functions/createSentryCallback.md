[**@saflib/vendors-sentry-client**](../index.md)

---

# Function: createSentryCallback()

> **createSentryCallback**(`options?`): (`app`) => `void`

Vue `createApp` callback: log Vue errors (and POST `/errors/record` on
localhost hosts). Init Sentry when `VITE_CLIENT_SENTRY_DSN` is set (skipped
on `*.localhost`).

## Parameters

| Parameter  | Type                                                              |
| ---------- | ----------------------------------------------------------------- |
| `options?` | [`SentryCallbackOptions`](../interfaces/SentryCallbackOptions.md) |

## Returns

> (`app`): `void`

### Parameters

| Parameter | Type               |
| --------- | ------------------ |
| `app`     | `App`\<`Element`\> |

### Returns

`void`
