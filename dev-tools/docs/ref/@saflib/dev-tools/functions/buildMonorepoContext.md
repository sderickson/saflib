[**@saflib/dev-tools**](../../../index.md)

---

# Function: buildMonorepoContext()

> **buildMonorepoContext**(`rootDir?`): [`MonorepoContext`](../interfaces/MonorepoContext.md)

Creates a MonorepoContext. If no rootdir is provided, it will find the first
parent directory with a package-lock.json and use that as the root, effectively
returning "this" package's monorepo context.

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `rootDir?` | `string` |

## Returns

[`MonorepoContext`](../interfaces/MonorepoContext.md)
