[**@saflib/node**](../../index.md)

---

# Function: formatHttpDurationMs()

> **formatHttpDurationMs**(`ms`): `string`

Fixed 6-char duration for access-log columns.
Under 10s: ` 325ms`. At/above 10s: ` 72.2s` / ` 999s` so long requests
are never left-truncated (e.g. `72233ms` must not become `2233ms`).

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `ms`      | `number` |

## Returns

`string`
