[**@saflib/drizzle**](../index.md)

---

# Type Alias: DbTransaction\<S\>

> **DbTransaction**\<`S`\> = `Parameters`\<[`TransactionCallback`](TransactionCallback.md)\<`S`\>\>\[`0`\]

Convenience type; the `tx` object passed to the drizzle transaction callback,
with a generic parameter for the schema.

## Type Parameters

| Type Parameter                      |
| ----------------------------------- |
| `S` _extends_ [`Schema`](Schema.md) |
