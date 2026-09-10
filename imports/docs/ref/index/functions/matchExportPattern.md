[**@saflib/imports**](../../index.md)

---

# Function: matchExportPattern()

> **matchExportPattern**(`importKey`, `patternKey`, `patternTarget`): `null` \| `string`

Match a Node.js package.json `exports` subpath pattern.

Node allows **one** `*` per pattern key and target. The `*` is string
substitution: the capture may include `/` (nested subpaths).

## Parameters

| Parameter       | Type     |
| --------------- | -------- |
| `importKey`     | `string` |
| `patternKey`    | `string` |
| `patternTarget` | `string` |

## Returns

`null` \| `string`

## See

https://nodejs.org/api/packages.html#subpath-patterns
