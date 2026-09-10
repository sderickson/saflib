[**@saflib/analytics-http**](../../../index.md)

---

# Function: recordProductEvent()

> **recordProductEvent**(`productEvent`, `source`): [`ProductEventRecord`](../interfaces/ProductEventRecord.md)

Append a product event to the in-memory ring buffer.
Used by HTTP handlers (client source) and server-side emitters.

## Parameters

| Parameter      | Type                                                          |
| -------------- | ------------------------------------------------------------- |
| `productEvent` | `Record`\<`string`, `unknown`\>                               |
| `source`       | [`ProductEventSource`](../type-aliases/ProductEventSource.md) |

## Returns

[`ProductEventRecord`](../interfaces/ProductEventRecord.md)
