[**@saflib/drizzle**](../../index.md)

---

# Interface: DbManagerOptions

Options for constructing a [DbManager](../classes/DbManager.md).

## Properties

### defaultPragmas?

> `optional` **defaultPragmas**: `Record`\<`string`, `string` \| `number`>\>

SQLite pragmas applied on every `connect()` and `attachConnection()` unless
overridden per call via [DbOptions.pragmas](DbOptions.md#pragmas).
