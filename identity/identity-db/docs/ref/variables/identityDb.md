[**@saflib/identity-db**](../index.md)

---

# Variable: identityDb

> `const` **identityDb**: `object`

For managing connections to the identity database.

## Type declaration

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
