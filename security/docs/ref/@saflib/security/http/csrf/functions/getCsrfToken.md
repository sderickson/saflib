[**@saflib/security**](../../../../../index.md)

---

# Function: getCsrfToken()

> **getCsrfToken**(`page`, `origin`, `options`): `Promise`\<`string`>\>

Fetch a double-submit CSRF token via an authenticated GET that sets
`_csrf_token` on the API origin.

## Parameters

| Parameter | Type                                                            |
| --------- | --------------------------------------------------------------- |
| `page`    | `Page`                                                          |
| `origin`  | `string`                                                        |
| `options` | [`GetCsrfTokenOptions`](../type-aliases/GetCsrfTokenOptions.md) |

## Returns

`Promise`\<`string`\>
