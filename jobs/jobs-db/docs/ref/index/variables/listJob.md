[**@saflib/jobs-db**](../../index.md)

---

# Variable: listJob()

> `const` **listJob**: (`dbKey`, `params`) => `Promise`\<`ReturnsError`\<`object`[], `never`>>\>\>

List jobs with optional filters, newest first (`created_at` desc, then `id`).

## Parameters

| Parameter | Type            |
| --------- | --------------- |
| `dbKey`   | `symbol`        |
| `params`  | `ListJobParams` |

## Returns

`Promise`\<`ReturnsError`\<`object`[], `never`\>\>
