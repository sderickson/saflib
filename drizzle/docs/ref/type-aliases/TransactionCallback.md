[**@saflib/drizzle**](../index.md)

---

# Type Alias: TransactionCallback\<S\>

> **TransactionCallback**\<`S`\> = `Parameters`\<[`DbConnection`](DbConnection.md)\<`S`\>\[`"transaction"`\]\>\[`0`\]

Convenience type; the first parameter of the `transaction` method, with a
generic parameter for the schema.

## Type Parameters

| Type Parameter                      |
| ----------------------------------- |
| `S` _extends_ [`Schema`](Schema.md) |
