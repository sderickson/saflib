[**@saflib/parser**](../index.md)

---

# Function: extractDrizzleTables()

> **extractDrizzleTables**(`source`): [`DrizzleTableEntry`](../interfaces/DrizzleTableEntry.md)[]

Extract drizzle `sqliteTable` / `pgTable` / `mysqlTable` definitions from
TypeScript source using the syntactic parser only (no type-checker).

Column JSDoc prefers the property assignment; when absent, falls back to a
matching property on an `*Entity` interface in the same file (common pattern
in this monorepo).

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `source`  | `string` |

## Returns

[`DrizzleTableEntry`](../interfaces/DrizzleTableEntry.md)[]
