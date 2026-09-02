[**@saflib/cron-spec**](../../../../index.md)

***

# Interface: operations

## Properties

### updateCronJobSettings

> **updateCronJobSettings**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### Description

The job name and settings to update.

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.enabled

> **enabled**: `boolean`

###### Description

Set whether the job is enabled.

##### requestBody.content.application/json.job\_name

> **job\_name**: `string`

###### Description

The name of the job to update.

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Job settings updated successfully.

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.created\_at?

> `readonly` `optional` **created\_at**: `string`

Format: date-time

###### Description

Timestamp when the job setting was created.

##### responses.200.content.application/json.enabled

> **enabled**: `boolean`

###### Description

Whether the job is enabled to run.

##### responses.200.content.application/json.enabled\_by?

> `optional` **enabled\_by**: `null` \| `string`

###### Description

Kratos identity id of the admin who last enabled the job. Null for pre-migration rows until re-enabled. Ticks skip when enabled with null.

##### responses.200.content.application/json.id?

> `readonly` `optional` **id**: `number`

###### Description

Unique identifier for the job setting.

##### responses.200.content.application/json.job\_name

> **job\_name**: `string`

###### Description

The unique name of the cron job.

##### responses.200.content.application/json.last\_run\_at?

> `optional` **last\_run\_at**: `null` \| `string`

Format: date-time

###### Description

Timestamp of the last time the job ran.

##### responses.200.content.application/json.last\_run\_status?

> `optional` **last\_run\_status**: `null` \| `"success"` \| `"fail"` \| `"running"` \| `"timed out"`

###### Description

Status of the last job run.

##### responses.200.content.application/json.runs\_next\_at?

> `readonly` `optional` **runs\_next\_at**: `null` \| `string`

Format: date-time

###### Description

Next scheduled tick when the job is enabled; null when disabled or schedule is unknown.

##### responses.200.content.application/json.schedule?

> `readonly` `optional` **schedule**: `null` \| `string`

###### Description

Cron schedule string from the registered JobsMap (e.g. `*/15 * * * *`).

##### responses.200.content.application/json.updated\_at?

> `readonly` `optional` **updated\_at**: `string`

Format: date-time

###### Description

Timestamp when the job setting was last updated.

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

Unauthorized - Invalid or missing authentication.

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

Forbidden - Insufficient permissions (requires cron:write).

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

Job setting with the specified name not found.

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
