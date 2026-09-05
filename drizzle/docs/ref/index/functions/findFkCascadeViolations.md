[**@saflib/drizzle**](../../index.md)

---

# Function: findFkCascadeViolations()

> **findFkCascadeViolations**(`packageRoot`): [`FkCascadeViolation`](../type-aliases/FkCascadeViolation.md)[]

Find FK cascade declarations in a drizzle package.

Scans migration `.sql` files for `ON DELETE/UPDATE CASCADE` and schema
`.ts` files (under `schemas/` plus root `schema.ts`) for
`onDelete` / `onUpdate: "cascade"`.

Cascades are banned because drizzle-kit table recreates (create, copy, drop)
can wipe unrelated child tables when FKs are enforced, and runtime deletes
should stay explicit in query code.

## Parameters

| Parameter     | Type     |
| ------------- | -------- |
| `packageRoot` | `string` |

## Returns

[`FkCascadeViolation`](../type-aliases/FkCascadeViolation.md)[]
