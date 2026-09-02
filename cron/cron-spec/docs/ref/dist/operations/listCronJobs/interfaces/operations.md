[**@saflib/cron-spec**](../../../../index.md)

***

# Interface: operations

## Properties

### listCronJobs

> **listCronJobs**: `object`

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

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

A list of cron jobs.

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`[]

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

Forbidden - Insufficient permissions (requires cron:read).

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
