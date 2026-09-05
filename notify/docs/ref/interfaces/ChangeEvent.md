[**@saflib/notify**](../index.md)

---

# Interface: ChangeEvent

Published in-process and on the SSE wire (JSON in the `data:` field).
Coarse change hint only — no resource bodies.

## Extended by

- [`ChangeEventWithId`](ChangeEventWithId.md)

## Properties

### operation\_id

> **operation\_id**: `string`

OpenAPI operationId of the write that completed.

---

### org\_id

> **org\_id**: `string`

Org scope for routing.

---

### params

> **params**: `Record`\<`string`, `string`>\>

Path params from the request (string values only).
