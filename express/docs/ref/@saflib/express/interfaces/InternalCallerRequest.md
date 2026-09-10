[**@saflib/express**](../../../index.md)

---

# Interface: InternalCallerRequest

## Properties

### asUser

> **asUser**: `object`

#### mfaCompleted?

> `optional` **mfaCompleted**: `boolean`

#### userId

> **userId**: `string`

---

### body?

> `optional` **body**: `unknown`

---

### claims?

> `optional` **claims**: `Record`\<`string`, `string`>\>

Extension claims (e.g. jobId, originalRequestId for jobs delivery).

---

### method

> **method**: `string`

---

### operationId

> **operationId**: `string`

OpenAPI operationId bound into the assertion.

---

### path

> **path**: `string`

Request path, e.g. `/matters/123`.

---

### query?

> `optional` **query**: `Record`\<`string`, `string`>\>

---

### requestId?

> `optional` **requestId**: `string`

---

### signal?

> `optional` **signal**: `AbortSignal`

Optional abort signal (delivery timeout).
