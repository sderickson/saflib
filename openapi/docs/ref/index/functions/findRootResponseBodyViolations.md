[**@saflib/openapi**](../../index.md)

---

# Function: findRootResponseBodyViolations()

> **findRootResponseBodyViolations**(`packageRoot`): [`RootResponseBodyViolation`](../type-aliases/RootResponseBodyViolation.md)[]

Find 2xx `application/json` response schemas that put a business object,
array, or bare `$ref` at the document root instead of a flat keyed envelope
(`{ recipe: Recipe }`, `{ recipes: Recipe[] }`).

## Parameters

| Parameter     | Type     |
| ------------- | -------- |
| `packageRoot` | `string` |

## Returns

[`RootResponseBodyViolation`](../type-aliases/RootResponseBodyViolation.md)[]
