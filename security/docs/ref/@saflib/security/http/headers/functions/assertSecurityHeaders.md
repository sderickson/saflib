[**@saflib/security**](../../../../../index.md)

---

# Function: assertSecurityHeaders()

> **assertSecurityHeaders**(`headers`, `options`): `void`

Assert baseline edge security headers on an HTML/SPA response.
Matches Caddy `(security-headers)` + per-site CSP expectations used in SAF products.

## Parameters

| Parameter | Type                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| `headers` | `Record`\<`string`, `string`\>                                                    |
| `options` | [`AssertSecurityHeadersOptions`](../type-aliases/AssertSecurityHeadersOptions.md) |

## Returns

`void`
