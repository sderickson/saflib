[**@saflib/security**](../../../../../index.md)

---

# Function: applySecurityPlaywrightEnv()

> **applySecurityPlaywrightEnv**(`options`): `void`

Set `DOMAIN` and `PROTOCOL` for security specs.
Only assigns keys that are provided — existing env values are left unchanged.
Service health checks use a hardcoded `api` subdomain in `@saflib/playwright`.

## Parameters

| Parameter | Type                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| `options` | [`SecurityPlaywrightEnvOptions`](../type-aliases/SecurityPlaywrightEnvOptions.md) |

## Returns

`void`
