[**@saflib/node**](../../index.md)

---

# Function: signAssertion()

> **signAssertion**(`assertion`): `string`

Signs an identity assertion.

Token format: `base64url(JSON payload).base64url(hmac-sha256).keyId`
Signs with the first key in `SAF_INTERNAL_ASSERTION_KEYS`.
Throws if TTL (`expiresAt - issuedAt`) exceeds 60s.

## Parameters

| Parameter   | Type                                                      |
| ----------- | --------------------------------------------------------- |
| `assertion` | [`IdentityAssertion`](../interfaces/IdentityAssertion.md) |

## Returns

`string`
