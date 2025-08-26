[**@saflib/vue**](../index.md)

***

# Function: createSafClient()

> **createSafClient**\<`Q`\>(`subdomain`): `Client`\<`Q`\>

Given a "paths" openapi generated type and a subdomain, creates a typed `openapi-fetch` client which queries the given subdomain. Uses the current domain and protocol. Handles CSRF token injection, and works in tests.

## Type Parameters

| Type Parameter |
| ------ |
| `Q` *extends* `object` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `subdomain` | `string` |

## Returns

`Client`\<`Q`\>
