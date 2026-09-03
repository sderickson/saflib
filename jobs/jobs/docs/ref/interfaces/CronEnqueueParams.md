[**@saflib/jobs**](../index.md)

---

# Interface: CronEnqueueParams

Params for one cron-tick enqueue. Kept free of `@saflib/cron-http` types so the
cron package can inject this function without a reverse dependency.
Field names match `@saflib/cron-http` `CronEnqueueParams` (camel); mapped to
snake_case jobs API bodies inside the enqueuer.

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

> `optional` **request**: `object`

#### body?

> `optional` **body**: `unknown`

##### Description

JSON request body for the target operation, when any.

#### path\_params?

> `optional` **path\_params**: `object`

##### Index Signature

\[`key`: `string`\]: `unknown`

##### Description

Path template substitutions keyed by parameter name.

#### query?

> `optional` **query**: `object`

##### Index Signature

\[`key`: `string`\]: `unknown`

##### Description

Query string parameters keyed by name.

---

### requestId

> **requestId**: `string`

Tick request id — assertion requestId / originalRequestId root.
