[**@saflib/cron-db**](../index.md)

***

# Variable: cronDb

> `const` **cronDb**: `object`

## Type declaration

### connect()

> **connect**: (`options?`) => `symbol`

Creates a "connection" to a database.

If onDisk is true, the database will be created on disk, in a "data" folder, with the name of the current environment.
If onDisk is a string, the database will be created at the given (absolute) path.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | `DbOptions` |

#### Returns

`symbol`

### disconnect()

> **disconnect**: (`key`) => `boolean`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `symbol` |

#### Returns

`boolean`

### jobSettings

> **jobSettings**: `object`

#### jobSettings.getAll()

> **getAll**: (`dbKey`) => `Promise`\<`object`[]\>

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |

##### Returns

`Promise`\<`object`[]\>

#### jobSettings.getByName()

> **getByName**: (`dbKey`, `jobName`) => `Promise`\<`Result`\>

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |

##### Returns

`Promise`\<`Result`\>

#### jobSettings.setEnabled()

> **setEnabled**: (`dbKey`, `jobName`, `enabled`) => `Promise`\<\{ `createdAt`: `Date`; `enabled`: `boolean`; `id`: `number`; `jobName`: `string`; `lastRunAt`: `null` \| `Date`; `lastRunStatus`: `null` \| `"success"` \| `"fail"` \| `"running"` \| `"timed out"`; `updatedAt`: `Date`; \}\>

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |
| `enabled` | `boolean` |

##### Returns

`Promise`\<\{ `createdAt`: `Date`; `enabled`: `boolean`; `id`: `number`; `jobName`: `string`; `lastRunAt`: `null` \| `Date`; `lastRunStatus`: `null` \| `"success"` \| `"fail"` \| `"running"` \| `"timed out"`; `updatedAt`: `Date`; \}\>

#### jobSettings.setLastRunStatus()

> **setLastRunStatus**: (`dbKey`, `jobName`, `status`) => `Promise`\<`Result`\>

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |
| `status` | [`LastRunStatus`](../type-aliases/LastRunStatus.md) |

##### Returns

`Promise`\<`Result`\>
