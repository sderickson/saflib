[**@saflib/cron**](../index.md)

---

# Interface: CronEnqueueParams

Params for one cron-tick enqueue. Mirrored by `@saflib/jobs` `makeCronEnqueuer`
so `@saflib/cron` does not import `@saflib/jobs`.

## Properties

### dedupeKey?

> `optional` **dedupeKey**: `string`

Defaults to `cron:{jobName}`.

---

### enabledBy

> **enabledBy**: `string`

Admin who enabled the cron job (`job_settings.enabled_by`).

---

### jobName

> **jobName**: `string`

Cron job name (becomes `cron:{jobName}` callingOperationId / default dedupe).

---

### operationId

> **operationId**: `string`

Target background operationId from the job's declarative enqueue config.

---

### priority?

> `optional` **priority**: `number`

---

### request?

> `optional` **request**: [`CronJobRequest`](CronJobRequest.md)

---

### requestId

> **requestId**: `string`

Tick request id — assertion requestId / originalRequestId root.
