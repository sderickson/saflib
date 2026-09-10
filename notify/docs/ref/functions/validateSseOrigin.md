[**@saflib/notify**](../index.md)

---

# Function: validateSseOrigin()

> **validateSseOrigin**(`origin`, `allowedOrigins`): `boolean`

CSRF-style check for cookie-authenticated long-lived GET (EventSource).
Missing/empty Origin is allowed (non-browser clients). When Origin is
present it must match an allowed app origin exactly.

## Parameters

| Parameter        | Type                    |
| ---------------- | ----------------------- |
| `origin`         | `undefined` \| `string` |
| `allowedOrigins` | readonly `string`[]     |

## Returns

`boolean`
