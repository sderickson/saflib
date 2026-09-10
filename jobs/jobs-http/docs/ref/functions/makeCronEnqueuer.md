[**@saflib/jobs-http**](../index.md)

---

# Function: makeCronEnqueuer()

> **makeCronEnqueuer**(`options`): [`CronEnqueuer`](../type-aliases/CronEnqueuer.md)

Factory for the enqueue function injected into `@saflib/cron-http`.
Signs with `callingOperationId = cron:{jobName}` and passes `on_behalf_of`
cron authority for the enabling admin. Does not import `@saflib/cron-http`.

## Parameters

| Parameter | Type                                                                  |
| --------- | --------------------------------------------------------------------- |
| `options` | [`MakeCronEnqueuerOptions`](../interfaces/MakeCronEnqueuerOptions.md) |

## Returns

[`CronEnqueuer`](../type-aliases/CronEnqueuer.md)
