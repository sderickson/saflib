[**@saflib/vue**](../../../index.md)

---

# Function: useClientCommon()

> **useClientCommon**(`componentName`): [`ProductEventCommon`](../type-aliases/ProductEventCommon.md)

Get the common context for a product event.

Usage:

```ts
const { onProductEvent, emitProductEvent } =
  makeProductEventLogger<ProductEvent>();
emitProductEvent({ ...useClientCommon("MyComponent"), event: "my-event" });
```

## Parameters

| Parameter       | Type     |
| --------------- | -------- |
| `componentName` | `string` |

## Returns

[`ProductEventCommon`](../type-aliases/ProductEventCommon.md)
