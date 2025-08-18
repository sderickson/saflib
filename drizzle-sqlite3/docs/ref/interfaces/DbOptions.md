[**@saflib/drizzle-sqlite3**](../index.md)

***

# Interface: DbOptions

When a "connection" is created, these parameters are provided.

## Properties

### doNotCreate?

> `optional` **doNotCreate**: `boolean`

If this is true, `connect` will throw an error if a new database file would
be created. This is mainly useful for production environments, where if
a configuration is incorrect and doesn't point to a database that you know
should exist, you wouldn't want it to just start a new one, but instead to
fail fast.

***

### onDisk?

> `optional` **onDisk**: `string` \| `boolean`

By default, the database will be created in memory. If onDisk is true, the
database will be created on disk, in a "data" folder, with the name of the
current environment. If onDisk is a string, the database will be created at
the given (absolute) path.
