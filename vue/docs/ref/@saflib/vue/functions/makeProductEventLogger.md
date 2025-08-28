[**@saflib/vue**](../../../index.md)

---

# Function: makeProductEventLogger()

> **makeProductEventLogger**\<`T`\>(): `object`

Create centralized object to emit and listen to product events. Provide a product event type to ensure type safety, produced as part of the API spec.

## Type Parameters

| Type Parameter                                                              |
| --------------------------------------------------------------------------- |
| `T` _extends_ [`ProductEventCommon`](../type-aliases/ProductEventCommon.md) |

## Returns

`object`

### emitProductEvent()

> **emitProductEvent**: (`event`) => `Promise`\<`unknown`\>

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `event`   | `T`  |

#### Returns

`Promise`\<`unknown`\>

### onProductEvent()

> **onProductEvent**: (`listener`) => `void`

#### Parameters

| Parameter  | Type                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| `listener` | [`ProductEventListener`](../type-aliases/ProductEventListener.md)\<`T`\> |

#### Returns

`void`

## Example

```ts
import type { ProductEvent } from "@your-org/service-spec"; // package using @saflib/openapi
const { onProductEvent, emitProductEvent } =
  makeProductEventLogger<ProductEvent>();
```
