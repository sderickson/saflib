[**@saflib/workflows**](../index.md)

---

# Function: makeOffshootLineReplace()

> **makeOffshootLineReplace**(`context`): (`line`) => `string`

Remap golden `@saflib/base-__offshoot-name__-*` / `Base*` tokens onto the
target product + offshoot, then apply `__placeholder__` interpolation.

## Parameters

| Parameter | Type                                                            |
| --------- | --------------------------------------------------------------- |
| `context` | [`OffshootInitContext`](../type-aliases/OffshootInitContext.md) |

## Returns

> (`line`): `string`

### Parameters

| Parameter | Type     |
| --------- | -------- |
| `line`    | `string` |

### Returns

`string`
