[**@saflib/secret-store**](../index.md)

---

# Function: setSecretStore()

> **setSecretStore**(`store`): `void`

Sets the process-level secret store. Idempotent — subsequent calls are no-ops.
Vendor packages (e.g. `@saflib/vendors-infisical`) call this from their configure helpers.

## Parameters

| Parameter | Type                                       |
| --------- | ------------------------------------------ |
| `store`   | [`SecretStore`](../classes/SecretStore.md) |

## Returns

`void`
