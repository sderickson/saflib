[**@saflib/vue**](../../../index.md)

---

# Function: useClientCommon()

> **useClientCommon**(`componentName`): `Omit`\<[`ProductEventCommon`](../type-aliases/ProductEventCommon.md), `"event"` \| `"context"`\>

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

`Omit`\<[`ProductEventCommon`](../type-aliases/ProductEventCommon.md), `"event"` \| `"context"`\>
