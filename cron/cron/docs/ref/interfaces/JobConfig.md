[**@saflib/cron**](../index.md)

---

# Interface: JobConfig

Configuration for a single cron job.

## Properties

### handler()

> **handler**: (`reqId`) => `Promise`\<`any`\>

The async function to execute when the job runs.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `reqId`   | `string` |

#### Returns

`Promise`\<`any`\>

---

### schedule

> **schedule**: `string`

Cron schedule string (e.g., '\* \* \* \* \*')
