[**@saflib/cron-db**](../index.md)

***

# Variable: jobSettingsDb

> `const` **jobSettingsDb**: `object`

Queries for getting info on cron jobs, and updating them.

## Type declaration

### getAll()

> **getAll**: (`dbKey`) => `Promise`\<[`JobSetting`](../interfaces/JobSetting.md)[]\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |

#### Returns

`Promise`\<[`JobSetting`](../interfaces/JobSetting.md)[]\>

### getByName()

> **getByName**: (`dbKey`, `jobName`) => `Promise`\<`GetByNameResult`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |

#### Returns

`Promise`\<`GetByNameResult`\>

### setEnabled()

> **setEnabled**: (`dbKey`, `jobName`, `enabled`) => `Promise`\<[`JobSetting`](../interfaces/JobSetting.md)\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |
| `enabled` | `boolean` |

#### Returns

`Promise`\<[`JobSetting`](../interfaces/JobSetting.md)\>

### setLastRunStatus()

> **setLastRunStatus**: (`dbKey`, `jobName`, `status`) => `Promise`\<`Result`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |
| `status` | [`LastRunStatus`](../type-aliases/LastRunStatus.md) |

#### Returns

`Promise`\<`Result`\>
