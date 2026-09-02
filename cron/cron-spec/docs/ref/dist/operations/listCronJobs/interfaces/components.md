[**@saflib/cron-spec**](../../../../index.md)

***

# Interface: components

## Properties

### headers

> **headers**: `never`

***

### parameters

> **parameters**: `never`

***

### pathItems

> **pathItems**: `never`

***

### requestBodies

> **requestBodies**: `never`

***

### responses

> **responses**: `never`

***

### schemas

> **schemas**: `object`

#### error

> **error**: `object`

##### error.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### error.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

#### job\_settings

> **job\_settings**: `object`

##### job\_settings.created\_at?

> `readonly` `optional` **created\_at**: `string`

Format: date-time

###### Description

Timestamp when the job setting was created.

##### job\_settings.enabled

> **enabled**: `boolean`

###### Description

Whether the job is enabled to run.

##### job\_settings.enabled\_by?

> `optional` **enabled\_by**: `null` \| `string`

###### Description

Kratos identity id of the admin who last enabled the job. Null for pre-migration rows until re-enabled. Ticks skip when enabled with null.

##### job\_settings.id?

> `readonly` `optional` **id**: `number`

###### Description

Unique identifier for the job setting.

##### job\_settings.job\_name

> **job\_name**: `string`

###### Description

The unique name of the cron job.

##### job\_settings.last\_run\_at?

> `optional` **last\_run\_at**: `null` \| `string`

Format: date-time

###### Description

Timestamp of the last time the job ran.

##### job\_settings.last\_run\_status?

> `optional` **last\_run\_status**: `null` \| `"success"` \| `"fail"` \| `"running"` \| `"timed out"`

###### Description

Status of the last job run.

##### job\_settings.runs\_next\_at?

> `readonly` `optional` **runs\_next\_at**: `null` \| `string`

Format: date-time

###### Description

Next scheduled tick when the job is enabled; null when disabled or schedule is unknown.

##### job\_settings.schedule?

> `readonly` `optional` **schedule**: `null` \| `string`

###### Description

Cron schedule string from the registered JobsMap (e.g. `*/15 * * * *`).

##### job\_settings.updated\_at?

> `readonly` `optional` **updated\_at**: `string`

Format: date-time

###### Description

Timestamp when the job setting was last updated.
