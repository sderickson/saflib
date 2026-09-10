[**@saflib/sdk**](../../../index.md)

---

# Variable: handleClientMethod()

> `const` **handleClientMethod**: \<`T`>\>(`request`) => `Promise`\<`T`>\>

Wrapper around an openapi-fetch client fetch method to handle errors and return the data in a way that is compatible with Tanstack Query.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                               |
| --------- | ---------------------------------- |
| `request` | `Promise`\<`ClientResult`\<`T`\>\> |

## Returns

`Promise`\<`T`\>
