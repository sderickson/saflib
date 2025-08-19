[**@saflib/cron-db**](../index.md)

***

# Variable: jobSettingsDb

> `const` **jobSettingsDb**: `object`

Queries for getting info on cron jobs, and updating them.

## Type declaration

### getAll()

> **getAll**: (`dbKey`) => `Promise`\<[`GetAllResult`](../type-aliases/GetAllResult.md)\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |

#### Returns

`Promise`\<[`GetAllResult`](../type-aliases/GetAllResult.md)\>

### getByName()

> **getByName**: (`dbKey`, `jobName`) => `Promise`\<[`GetByNameResult`](../type-aliases/GetByNameResult.md)\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |

#### Returns

`Promise`\<[`GetByNameResult`](../type-aliases/GetByNameResult.md)\>

### setEnabled()

> **setEnabled**: (`dbKey`, `jobName`, `enabled`) => `Promise`\<[`SetEnabledResult`](../type-aliases/SetEnabledResult.md)\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |
| `enabled` | `boolean` |

#### Returns

`Promise`\<[`SetEnabledResult`](../type-aliases/SetEnabledResult.md)\>

### setLastRunStatus()

> **setLastRunStatus**: (`dbKey`, `jobName`, `status`) => `Promise`\<[`SetLastRunStatusResult`](../type-aliases/SetLastRunStatusResult.md)\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `jobName` | `string` |
| `status` | `"success"` \| `"fail"` \| `"running"` \| `"timed out"` |

#### Returns

`Promise`\<[`SetLastRunStatusResult`](../type-aliases/SetLastRunStatusResult.md)\>
