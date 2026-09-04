[**@saflib/jobs-spec**](../../../../index.md)

---

# Interface: operations

## Properties

### retryJob

> **retryJob**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path

> **path**: `object`

##### parameters.path.id

> **id**: `string`

###### Description

Short id of the job to retry.

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Job re-queued as pending with attempt counters reset.

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.job

> **job**: `object`

##### responses.200.content.application/json.job.attempt

> **attempt**: `number`

###### Description

Number of delivery attempts consumed so far (0 before first claim).

###### Example

```ts
0;
```

##### responses.200.content.application/json.job.authority

> **authority**: \{ `kind`: `"request"`; `request_id`: `string`; `user_id`: `string`; \} \| \{ `kind`: `"resource"`; `resource_id`: `string`; `resource_kind`: `string`; `user_id`: `string`; \} \| \{ `cron_job_name`: `string`; `kind`: `"cron"`; `user_id`: `string`; \}

###### Type declaration

\{ `kind`: `"request"`; `request_id`: `string`; `user_id`: `string`; \}

\{ `kind`: `"resource"`; `resource_id`: `string`; `resource_kind`: `string`; `user_id`: `string`; \}

\{ `cron_job_name`: `string`; `kind`: `"cron"`; `user_id`: `string`; \}

###### Description

Root grant for the job chain (copied verbatim by children). Discriminated on `kind`. Wire form excludes the embedded enqueue assertion token.

##### responses.200.content.application/json.job.concurrency\_key

> **concurrency\_key**: `null` \| `string`

###### Description

Optional key limiting concurrency: at most one running job per key (e.g. `matter:{id}`).

###### Example

```ts
matter: demo - 1;
```

##### responses.200.content.application/json.job.created\_at

> **created\_at**: `string`

Format: date-time

###### Description

When the job row was created.

###### Example

```ts
2026-08-06T20:59:55.000Z
```

##### responses.200.content.application/json.job.dedupe\_key

> **dedupe\_key**: `null` \| `string`

###### Description

Optional key unique among non-terminal jobs. Re-enqueue with the same live key upserts (pushes run_at, refreshes request) and returns the existing job.

###### Example

```ts
matter:demo-1:claim
```

##### responses.200.content.application/json.job.enqueued\_by\_operation\_id

> **enqueued\_by\_operation\_id**: `string`

###### Description

Calling operationId that enqueued this job (trigger-map edge).

###### Example

```ts
startJobsDemo;
```

##### responses.200.content.application/json.job.finished\_at

> **finished\_at**: `null` \| `string`

Format: date-time

###### Description

When the job reached a terminal status; null while still active.

###### Example

```ts
null;
```

##### responses.200.content.application/json.job.id

> **id**: `string`

###### Description

Short identifier for the job (from generateShortId).

###### Example

```ts
Jb3k_mN7;
```

##### responses.200.content.application/json.job.max\_attempts

> **max\_attempts**: `number`

###### Description

Maximum delivery attempts before the job becomes dead (exhausted).

###### Example

```ts
5;
```

##### responses.200.content.application/json.job.operation\_id

> **operation\_id**: `string`

###### Description

Target OpenAPI operationId resolved at delivery time.

###### Example

```ts
jobsDemoStepB;
```

##### responses.200.content.application/json.job.original\_request\_id

> **original\_request\_id**: `string`

###### Description

Chain-root request id (user request / webhook X-Request-ID, or cron-tick id). Copied from parent on chained enqueues; joins audit_event.request_id.

###### Example

```ts
r - abc123;
```

##### responses.200.content.application/json.job.parent\_job\_id

> **parent\_job\_id**: `null` \| `string`

###### Description

Short id of the job that enqueued this one, or null at the chain root.

###### Example

```ts
null;
```

##### responses.200.content.application/json.job.priority

> **priority**: `number`

###### Description

Claim priority; higher values are claimed first. Default 0.

###### Example

```ts
0;
```

##### responses.200.content.application/json.job.request

> **request**: `object`

###### Description

Capped request payload delivered to the target operation (serialized size ≤ 16 KB). Path params, query, and body are optional and substituted into the operation's path template / request.

###### Example

```ts
{
             *       "body": {
             *         "failures_before_success": 2
             *       }
             *     }
```

##### responses.200.content.application/json.job.request.body?

> `optional` **body**: `unknown`

###### Description

JSON request body for the target operation, when any.

##### responses.200.content.application/json.job.request.path\_params?

> `optional` **path\_params**: `object`

###### Index Signature

\[`key`: `string`\]: `unknown`

###### Description

Path template substitutions keyed by parameter name.

##### responses.200.content.application/json.job.request.query?

> `optional` **query**: `object`

###### Index Signature

\[`key`: `string`\]: `unknown`

###### Description

Query string parameters keyed by name.

##### responses.200.content.application/json.job.result

> **result**: `null` \| \{ `error_body?`: `null` \| `string`; `status_code?`: `number`; `terminal_reason?`: `null` \| `"exhausted"` \| `"permanent-status"` \| `"rejected-by-endpoint"` \| `"auth-unresolvable"` \| `"cancelled-by-admin"` \| `"cancelled-by-chain"`; \}

###### Type declaration

`null`

\{ `error_body?`: `null` \| `string`; `status_code?`: `number`; `terminal_reason?`: `null` \| `"exhausted"` \| `"permanent-status"` \| `"rejected-by-endpoint"` \| `"auth-unresolvable"` \| `"cancelled-by-admin"` \| `"cancelled-by-chain"`; \}

###### Description

Outcome of the latest terminal or failed attempt. Null while the job has not yet finished an attempt that records a result. `error_body` is set only on failure and capped at 8 KB.

##### responses.200.content.application/json.job.run\_at

> **run\_at**: `string`

Format: date-time

###### Description

Earliest time the job may be claimed for delivery.

###### Example

```ts
2026-08-06T21:00:00.000Z
```

##### responses.200.content.application/json.job.started\_at

> **started\_at**: `null` \| `string`

Format: date-time

###### Description

When the current (or last) delivery attempt started; null if never claimed.

###### Example

```ts
null;
```

##### responses.200.content.application/json.job.status

> **status**: `"pending"` \| `"running"` \| `"retrying"` \| `"succeeded"` \| `"dead"` \| `"cancelled"`

###### Description

Lifecycle state. `pending`/`retrying` are claimable; `running` is in delivery; `succeeded`/`dead`/`cancelled` are terminal.

###### Example

```ts
pending
@enum {string}
```

##### responses.200.content.application/json.job.user\_id

> **user\_id**: `string`

###### Description

Acting user whose authority the job runs under.

###### Example

```ts
Us7k_pQ2;
```

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

Unauthorized - missing or invalid auth headers, or not logged in.

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.403

> **403**: `object`

###### Description

Forbidden - site admin privileges required.

##### responses.403.content

> **content**: `object`

##### responses.403.content.application/json

> **application/json**: `object`

##### responses.403.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.403.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.403.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.404

> **404**: `object`

###### Description

Job not found.

##### responses.404.content

> **content**: `object`

##### responses.404.content.application/json

> **application/json**: `object`

##### responses.404.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.404.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.404.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.409

> **409**: `object`

###### Description

Job is not dead or cancelled and cannot be retried.

##### responses.409.content

> **content**: `object`

##### responses.409.content.application/json

> **application/json**: `object`

##### responses.409.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.409.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.409.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`
