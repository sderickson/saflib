[**@saflib/node**](../../index.md)

---

# Function: verifyAssertion()

> **verifyAssertion**(`token`): [`IdentityAssertion`](../interfaces/IdentityAssertion.md)

Verifies an identity assertion token against any configured key.

Throws typed errors on bad signature, expiry, unknown keyId, TTL > 60s,
or malformed token.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `token`   | `string` |

## Returns

[`IdentityAssertion`](../interfaces/IdentityAssertion.md)
