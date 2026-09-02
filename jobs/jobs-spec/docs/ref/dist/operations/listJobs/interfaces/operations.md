[**@saflib/jobs-spec**](../../../../index.md)

***

# Interface: operations

## Properties

### listJobs

> **listJobs**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `object`

##### parameters.query.created\_after?

> `optional` **created\_after**: `string`

###### Description

Only include jobs with created_at greater than or equal to this instant.

##### parameters.query.created\_before?

> `optional` **created\_before**: `string`

###### Description

Only include jobs with created_at less than or equal to this instant.

##### parameters.query.limit?

> `optional` **limit**: `number`

###### Description

Page size (default implementation-defined).

##### parameters.query.offset?

> `optional` **offset**: `number`

###### Description

Number of matching jobs to skip before returning results.

##### parameters.query.operation\_id?

> `optional` **operation\_id**: `string`

###### Description

Filter by target operationId.

##### parameters.query.original\_request\_id?

> `optional` **original\_request\_id**: `string`

###### Description

Filter by chain-root request id.

##### parameters.query.status?

> `optional` **status**: `"pending"` \| `"running"` \| `"retrying"` \| `"succeeded"` \| `"dead"` \| `"cancelled"`

###### Description

Filter by job status.

##### parameters.query.user\_id?

> `optional` **user\_id**: `string`

###### Description

Filter by acting user id.

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Matching jobs for this page.

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.jobs

> **jobs**: `object`[]

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
