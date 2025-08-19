[**@saflib/cron**](../index.md)

***

# Function: runCron()

> **runCron**(`options`): `undefined` \| `symbol`

Runs the cron jobs until the process is killed. Returns a DB key you can
provide to the cron router to share the same connection.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`CronServiceOptions`](../interfaces/CronServiceOptions.md) |

## Returns

`undefined` \| `symbol`
