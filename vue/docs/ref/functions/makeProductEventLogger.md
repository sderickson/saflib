[**@saflib/vue**](../index.md)

***

# Function: makeProductEventLogger()

> **makeProductEventLogger**\<`T`\>(): `object`

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Returns

`object`

### emitProductEvent()

> **emitProductEvent**: (`event`) => `Promise`\<`unknown`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `T` |

#### Returns

`Promise`\<`unknown`\>

### onProductEvent()

> **onProductEvent**: (`listener`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `listener` | [`ProductEventListener`](../type-aliases/ProductEventListener.md)\<`T`\> |

#### Returns

`void`
