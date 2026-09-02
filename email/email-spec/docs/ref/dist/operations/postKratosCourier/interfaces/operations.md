[**@saflib/email-spec**](../../../../index.md)

***

# Interface: operations

## Properties

### postKratosCourier

> **postKratosCourier**: `object`

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

##### requestBody.content.application/json.recipient

> **recipient**: `string`

##### requestBody.content.application/json.template\_data?

> `optional` **template\_data**: `object`

###### Index Signature

\[`key`: `string`\]: `unknown`

##### requestBody.content.application/json.template\_type

> **template\_type**: `string`

#### responses

> **responses**: `object`

##### responses.204

> **204**: `object`

###### Description

Email accepted for delivery

##### responses.204.content?

> `optional` **content**: `undefined`

##### responses.204.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.500

> **500**: `object`

###### Description

Failed to send email

##### responses.500.content

> **content**: `object`

##### responses.500.content.application/json

> **application/json**: `object`

##### responses.500.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.500.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.500.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`
