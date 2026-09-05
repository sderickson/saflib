[**@saflib/jobs-db**](../../index.md)

---

# Variable: countByStatusJob()

> `const` **countByStatusJob**: (`dbKey`) => `Promise`\<`ReturnsError`\<`JobStatusCount`[], `never`>>\>\>

Counts of jobs grouped by status (for the `jobs_queue_depth` gauge).
Statuses with zero jobs are omitted.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `dbKey`   | `symbol` |

## Returns

`Promise`\<`ReturnsError`\<`JobStatusCount`[], `never`\>\>
