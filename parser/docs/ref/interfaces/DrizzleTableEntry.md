[**@saflib/parser**](../index.md)

---

# Interface: DrizzleTableEntry

One drizzle `sqliteTable` / `pgTable` / `mysqlTable` found by [extractDrizzleTables](../functions/extractDrizzleTables.md).

## Properties

### columns

> **columns**: [`DrizzleTableColumn`](DrizzleTableColumn.md)[]

---

### docstring

> **docstring**: `null` \| `string`

First prose line of leading JSDoc on the table `const` declaration,
or `null` when absent.

---

### exportName

> **exportName**: `string`

Binding name of the const (`packageMetricsTable`).

---

### tableName

> **tableName**: `string`

SQL table name (first arg to `sqliteTable`).
