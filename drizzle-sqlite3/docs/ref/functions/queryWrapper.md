[**@saflib/drizzle-sqlite3**](../index.md)

***

# Function: queryWrapper()

> **queryWrapper**\<`T`, `A`\>(`queryFunc`): (...`args`) => `Promise`\<`T`\>

All queries should use this wrapper. It will catch and obfuscate unhandled
errors, and rethrow handled errors, though really handled errors should be
returned, not thrown.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `A` *extends* `any`[] |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `queryFunc` | (...`args`) => `Promise`\<`T`\> |

## Returns

> (...`args`): `Promise`\<`T`\>

### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `A` |

### Returns

`Promise`\<`T`\>
