[**@saflib/jobs**](../index.md)

---

# Interface: EnqueueParams

## Extended by

- [`EnqueueOnBehalfOfParams`](EnqueueOnBehalfOfParams.md)

## Properties

### concurrency\_key?

> `optional` **concurrency\_key**: `null` \| `string`

---

### dedupe\_key?

> `optional` **dedupe\_key**: `null` \| `string`

---

### delay\_ms?

> `optional` **delay\_ms**: `number`

---

### operation\_id

> **operation\_id**: `string`

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

### run\_at?

> `optional` **run\_at**: `string`
