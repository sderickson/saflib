[**@saflib/drizzle**](../../index.md)

---

# Function: assertNoFkCascades()

> **assertNoFkCascades**(`packageRoot`): `void`

Throw if any migration SQL or schema TS in `packageRoot` declares FK cascades.
Defaults to `process.cwd()` so package tests can call it with no args.

## Parameters

| Parameter     | Type     |
| ------------- | -------- |
| `packageRoot` | `string` |

## Returns

`void`
