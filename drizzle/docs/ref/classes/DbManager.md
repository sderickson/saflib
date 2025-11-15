[**@saflib/drizzle**](../index.md)

---

# Class: DbManager\<S, C\>

A class which mainly manages "connections" to the sqlite3 database and drizzle
ORM. Any package which depends on this will create a single instance given the
database schema and config, export the public interface, and be used by queries
to access the drizzle ORM. This way the package which depends on
`@saflib/drizzle` has full access to its database, but packages
which depend on _it_ only have access to an opaque key which only database
queries can use.

## Type Parameters

| Type Parameter                                      |
| --------------------------------------------------- |
| `S` _extends_ [`Schema`](../type-aliases/Schema.md) |
| `C` _extends_ `Config`                              |

## Constructors

### Constructor

> **new DbManager**\<`S`, `C`\>(`schema`, `c`, `rootUrl`): `DbManager`\<`S`, `C`\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `schema`  | `S`      |
| `c`       | `C`      |
| `rootUrl` | `string` |

#### Returns

`DbManager`\<`S`, `C`\>

## Methods

### connect()

> **connect**(`options?`): `symbol`

Creates a "connection" to a database.

If onDisk is true, the database will be created on disk, in a "data" folder, with the name of the current environment.
If onDisk is a string, the database will be created at the given (absolute) path.

#### Parameters

| Parameter  | Type                                      |
| ---------- | ----------------------------------------- |
| `options?` | [`DbOptions`](../interfaces/DbOptions.md) |

#### Returns

`symbol`

---

### createBackup()

> **createBackup**(`key`): `Promise`\<`undefined` \| `Readable`\>

Creates a backup of the database file and returns a readable stream with automatic cleanup.
The backup file is created in the same directory as the original database file
with a unique temporary name. The stream will automatically clean up the temporary
file when it's closed or garbage collected.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`Promise`\<`undefined` \| `Readable`\>

---

### disconnect()

> **disconnect**(`key`): `boolean`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`boolean`

---

### get()

> **get**(`key`): `undefined` \| [`DbConnection`](../type-aliases/DbConnection.md)\<`S`\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`undefined` \| [`DbConnection`](../type-aliases/DbConnection.md)\<`S`\>

---

### publicInterface()

> **publicInterface**(): `object`

#### Returns

##### connect()

> **connect**: (`options?`) => `symbol`

Creates a "connection" to a database.

If onDisk is true, the database will be created on disk, in a "data" folder, with the name of the current environment.
If onDisk is a string, the database will be created at the given (absolute) path.

###### Parameters

| Parameter  | Type                                      |
| ---------- | ----------------------------------------- |
| `options?` | [`DbOptions`](../interfaces/DbOptions.md) |

###### Returns

`symbol`

##### createBackup()

> **createBackup**: (`key`) => `Promise`\<`undefined` \| `Readable`\>

Creates a backup of the database file and returns a readable stream with automatic cleanup.
The backup file is created in the same directory as the original database file
with a unique temporary name. The stream will automatically clean up the temporary
file when it's closed or garbage collected.

###### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

###### Returns

`Promise`\<`undefined` \| `Readable`\>

##### disconnect()

> **disconnect**: (`key`) => `boolean`

###### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

###### Returns

`boolean`
