[**@saflib/jobs-db**](../../index.md)

---

# Variable: listRunningJobsJob()

> `const` **listRunningJobsJob**: (`dbKey`) => `Promise`\<`ReturnsError`\<`RunningJobRow`[], `never`>>\>\>

Returns all jobs currently in `running` status (for stall detection).

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `dbKey`   | `symbol` |

## Returns

`Promise`\<`ReturnsError`\<`RunningJobRow`[], `never`\>\>
