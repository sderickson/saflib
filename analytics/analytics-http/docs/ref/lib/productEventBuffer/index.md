[**@saflib/analytics-http**](../../index.md)

---

# lib/productEventBuffer

## Interfaces

| Interface                                              | Description |
| ------------------------------------------------------ | ----------- |
| [ProductEventRecord](interfaces/ProductEventRecord.md) | -           |

## Type Aliases

| Type Alias                                               | Description |
| -------------------------------------------------------- | ----------- |
| [ProductEventSource](type-aliases/ProductEventSource.md) | -           |

## Functions

| Function                                                                                    | Description                                                                                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [listProductEvents](functions/listProductEvents.md)                                         | Snapshot of buffered product events.                                                                                 |
| [recordProductEvent](functions/recordProductEvent.md)                                       | Append a product event to the in-memory ring buffer. Used by HTTP handlers (client source) and server-side emitters. |
| [resetProductEventBufferForTests](functions/resetProductEventBufferForTests.md)             | Clear buffer and reset ids — for tests only.                                                                         |
| [setProductEventBufferCapacityForTests](functions/setProductEventBufferCapacityForTests.md) | Override ring buffer capacity — for tests only.                                                                      |
