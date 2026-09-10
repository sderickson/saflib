[**@saflib/analytics-spec**](../../../../index.md)

---

# Interface: components

## Properties

### headers

> **headers**: `never`

---

### parameters

> **parameters**: `never`

---

### pathItems

> **pathItems**: `never`

---

### requestBodies

> **requestBodies**: `never`

---

### responses

> **responses**: `never`

---

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

#### product-event-record

> **product-event-record**: `object`

##### Description

A product analytics event stored in the in-memory ring buffer.

##### product-event-record.id

> **id**: `number`

###### Description

Monotonic id for pagination.

##### product-event-record.name

> **name**: `string`

###### Description

Product event name (same as product_event.event).

##### product-event-record.payload

> **payload**: `object`

###### Index Signature

\[`key`: `string`\]: `unknown`

###### Description

Full product event JSON as recorded.

##### product-event-record.source

> **source**: `"client"` \| `"server"`

###### Description

Whether the event originated from a browser client or server code.

##### product-event-record.timestamp

> **timestamp**: `string`

Format: date-time
