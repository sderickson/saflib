[**@saflib/analytics-spec**](../../../../index.md)

---

# Interface: operations

## Properties

### recordProductEvent

> **recordProductEvent**: `object`

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

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.product\_event

> **product\_event**: `object` & `object`

###### Type declaration

###### client?

> `optional` **client**: `string`

###### component?

> `optional` **component**: `string`

###### context?

> `optional` **context**: `object`

###### Index Signature

\[`key`: `string`\]: `unknown`

###### event

> **event**: `string`

###### view?

> `optional` **view**: `string`

#### responses

> **responses**: `object`

##### responses.204

> **204**: `object`

###### Description

Event recorded in the server ring buffer.

##### responses.204.content?

> `optional` **content**: `undefined`

##### responses.204.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.400

> **400**: `object`

###### Description

Invalid request body.

##### responses.400.content

> **content**: `object`

##### responses.400.content.application/json

> **application/json**: `object`

##### responses.400.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.400.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.400.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`
