[**@saflib/cron-http**](../index.md)

***

# Interface: JobConfig

Configuration for a single cron job. Cron ticks only enqueue; work runs
through the target background operation.

## Properties

### enqueue

> **enqueue**: `object`

The single job this schedule enqueues.

#### dedupeKey?

> `optional` **dedupeKey**: `string`

Defaults to `cron:{jobName}`.

#### operationId

> **operationId**: `string`

#### priority?

> `optional` **priority**: `number`

#### request?

> `optional` **request**: [`CronJobRequest`](CronJobRequest.md)

Static request: { path_params?, query?, body? }.

***

### schedule

> **schedule**: `string`

Cron schedule string (e.g., '* * * * *')
