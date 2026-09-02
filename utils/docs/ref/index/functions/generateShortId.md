[**@saflib/utils**](../../index.md)

---

# Function: generateShortId()

> **generateShortId**(`byteLength`): `string`

Short random ID (12 base64url chars by default). Uses crypto.getRandomValues; URL-safe.
Default byteLength 9 → 72 bits of entropy. Optional byteLength override for callers
that need a different width.

## Parameters

| Parameter    | Type     | Default value |
| ------------ | -------- | ------------- |
| `byteLength` | `number` | `9`           |

## Returns

`string`
