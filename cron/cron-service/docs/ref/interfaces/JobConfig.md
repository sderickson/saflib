[**@saflib/cron-service**](../index.md)

***

# Interface: JobConfig

Configuration for a single cron job.

## Properties

### customLogError?

> `optional` **customLogError**: [`CustomLogError`](../type-aliases/CustomLogError.md)

Optional error reporter for the job. Returns true if the error was logged.

***

### enabled

> **enabled**: `boolean`

Default enabled state (primarily for initial setup, DB state overrides).

***

### handler()

> **handler**: (`reqId`) => `Promise`\<`any`\>

The async function to execute when the job runs.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reqId` | `string` |

#### Returns

`Promise`\<`any`\>

***

### schedule

> **schedule**: `string`

Cron schedule string (e.g., '* * * * *')

***

### timeoutSeconds?

> `optional` **timeoutSeconds**: `number`

Optional job execution timeout in seconds (defaults to 10 if not provided).
