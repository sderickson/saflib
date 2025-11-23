[**@saflib/drizzle**](../index.md)

---

# Interface: DbOptions

When a "connection" is created, these parameters are provided.

## Properties

### onDisk?

> `optional` **onDisk**: `string` \| `boolean`

By default, the database will be created in memory. If onDisk is true, the
database will be created on disk, in a "data" folder, with the name of the
current environment. If onDisk is a string, the database will be created at
the given (absolute) path.

---

### overrideTestDefault?

> `optional` **overrideTestDefault**: `boolean`

During tests, onDisk is ignored and the database will be created in memory.
If you need to override this behavior, set this to true.
