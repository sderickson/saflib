[**@saflib/notify**](../index.md)

---

# Interface: ChangeEventWithId

Change event plus monotonic id for SSE `id:` / Last-Event-ID replay.

## Extends

- [`ChangeEvent`](ChangeEvent.md)

## Properties

### id

> **id**: `string`

---

### operation\_id

> **operation\_id**: `string`

OpenAPI operationId of the write that completed.

#### Inherited from

[`ChangeEvent`](ChangeEvent.md).[`operation_id`](ChangeEvent.md#operation_id)

---

### org\_id

> **org\_id**: `string`

Org scope for routing.

#### Inherited from

[`ChangeEvent`](ChangeEvent.md).[`org_id`](ChangeEvent.md#org_id)

---

### params

> **params**: `Record`\<`string`, `string`>\>

Path params from the request (string values only).

#### Inherited from

[`ChangeEvent`](ChangeEvent.md).[`params`](ChangeEvent.md#params)
