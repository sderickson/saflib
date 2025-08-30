[**@saflib/cron-db**](../index.md)

---

# Variable: cronDb

> `const` **cronDb**: `object`

For managing connections to the cron database.

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

### disconnect()

> **disconnect**: (`key`) => `boolean`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `symbol` |

#### Returns

`boolean`
