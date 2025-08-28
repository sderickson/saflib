[**@saflib/drizzle**](../index.md)

***

# Function: queryWrapper()

> **queryWrapper**\<`F`\>(`queryFunc`): `F`

All queries should use this wrapper. It will catch and obfuscate unhandled
errors, and rethrow handled errors, though really handled errors should be
returned, not thrown.

## Type Parameters

| Type Parameter |
| ------ |
| `F` *extends* (...`args`) => `Promise`\<`any`\> |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `queryFunc` | `F` |

## Returns

`F`
