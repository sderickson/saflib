[**@saflib/cron-db**](../index.md)

---

# Variable: cronDb

> `const` **cronDb**: `object`

For managing connections to the cron database.

## Type declaration

### attachConnection()

> **attachConnection**: (`key`, `sqlitePath`, `options?`) => `void`

Open an on-disk SQLite file and register it under an existing DbKey
(after [disconnect](#disconnect) removed the prior connection). Used for audit seal
rotation so the process keeps the same key while replacing the file.

#### Parameters

| Parameter    | Type        |
| ------------ | ----------- |
| `key`        | `symbol`    |
| `sqlitePath` | `string`    |
| `options?`   | `DbOptions` |

#### Returns

`void`

### backupTo()

> **backupTo**: (`key`, `destinationPath`) => `Promise`\<`void`\>

Online SQLite backup of the database registered under `key` to `destinationPath`.
Uses better-sqlite3's `db.backup()` (SQLite Online Backup API), so the
source DB can stay open and writable during the copy.

The destination file is overwritten if it exists. Parent directory must exist.

#### Parameters

| Parameter         | Type     |
| ----------------- | -------- |
| `key`             | `symbol` |
| `destinationPath` | `string` |

#### Returns

`Promise`\<`void`\>

### clearAllTablesForTests()

> **clearAllTablesForTests**: (`key`) => `void`

Deletes all application rows from every table in the connected database.
Preserves `__drizzle_migrations`. For query unit tests that reuse one
in-memory connection per file (`beforeAll` connect + `beforeEach` reset).

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`void`

### connect()

> **connect**: (`options?`) => `symbol`

Creates a "connection" to a database.

If onDisk is true, the database will be created on disk, in a "data" folder, with the name of the current environment.
If onDisk is a string, the database will be created at the given (absolute) path.

#### Parameters

| Parameter  | Type        |
| ---------- | ----------- |
| `options?` | `DbOptions` |

#### Returns

`symbol`

### createBackup()

> **createBackup**: (`key`) => `Promise`\<`undefined` \| `Readable`\>

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

### disconnect()

> **disconnect**: (`key`) => `boolean`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`boolean`

### getDbPath()

> **getDbPath**: (`key`) => `undefined` \| `string`

SQLite path for the key, or `:memory:`, or `undefined` if unknown.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`undefined` \| `string`

### restore()

> **restore**: (`key`, `stream`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `key`     | `symbol`   |
| `stream`  | `Readable` |

#### Returns

`Promise`\<`void`\>

### walCheckpointTruncate()

> **walCheckpointTruncate**: (`key`) => `void`

Flush WAL pages into the main db file and reset the WAL (SQLite backup-safe).

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`void`
