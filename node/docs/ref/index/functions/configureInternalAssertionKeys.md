[**@saflib/node**](../../index.md)

---

# Function: configureInternalAssertionKeys()

> **configureInternalAssertionKeys**(`store`): `Promise`\<`void`>\>

Loads HMAC assertion keys from the secret store when not set in env (prod).
Dev sets `SAF_INTERNAL_ASSERTION_KEYS` in env; job tests stub env directly.
Prod-local with `INFISICAL_TOKEN=mock` gets the placeholder `"mock"`, which
`signAssertion` / `verifyAssertion` accept as a fixed local key.

## Parameters

| Parameter | Type          |
| --------- | ------------- |
| `store`   | `SecretStore` |

## Returns

`Promise`\<`void`\>
