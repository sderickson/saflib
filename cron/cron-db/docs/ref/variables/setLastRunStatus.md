[**@saflib/cron-db**](../index.md)

---

# Variable: setLastRunStatus()

> `const` **setLastRunStatus**: (`dbKey`, `jobName`, `status`) => `Promise`\<[`SetLastRunStatusResult`](../type-aliases/SetLastRunStatusResult.md)>\>

## Parameters

| Parameter | Type                                                    |
| --------- | ------------------------------------------------------- |
| `dbKey`   | `symbol`                                                |
| `jobName` | `string`                                                |
| `status`  | `"success"` \| `"fail"` \| `"running"` \| `"timed out"` |

## Returns

`Promise`\<[`SetLastRunStatusResult`](../type-aliases/SetLastRunStatusResult.md)\>
