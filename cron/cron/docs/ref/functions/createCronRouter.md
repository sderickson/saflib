[**@saflib/cron**](../index.md)

***

# Function: createCronRouter()

> **createCronRouter**(`options`): `Router`

Creates a router that your own Express app can include, in
order to serve cron API endpoints. These provide runtime
information and the ability do enable/disable cron jobs.
They are only accessible to admin users.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`CronServiceOptions`](../interfaces/CronServiceOptions.md) |

## Returns

`Router`
