[**@saflib/vue**](../../../../index.md)

***

# Function: withVueQuery()

> **withVueQuery**\<`T`\>(`composable`, `queryClient?`): \[`T`, `App`\<`Element`\>, `any`\]

Helper function to test Vue Query composables in isolation

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `composable` | () => `T` | The composable function to test |
| `queryClient?` | `any` | Optional custom query client |

## Returns

\[`T`, `App`\<`Element`\>, `any`\]

A tuple containing the composable result, the Vue app instance, and the query client
