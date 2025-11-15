[**@saflib/workflows**](../index.md)

---

# Function: makeLineReplace()

> **makeLineReplace**(`context`): (`line`) => `string`

Creates a line-replace function which will handle template interpolation, given a context.

The context is expected to be an object of camelCase keys to kebab-case values. It looks for **variables** and replaces them with the given context values.
It will automatically handle variant names, such as **kebab-case**, **snake_case**, **PascalCase**, **camelCase**, and **SNAKE_CASE**,
so you provide one variant of the string and it will automatically convert keys and values with the appropriate casing and connecting characters.

## Parameters

| Parameter | Type                             |
| --------- | -------------------------------- |
| `context` | \{\[`key`: `string`\]: `any`; \} |

## Returns

> (`line`): `string`

### Parameters

| Parameter | Type     |
| --------- | -------- |
| `line`    | `string` |

### Returns

`string`
