[**@saflib/jobs**](../index.md)

---

# Function: buildOperationMap()

> **buildOperationMap**(`apiSpec`): [`OperationMap`](../type-aliases/OperationMap.md)

Walk a bundled OpenAPI document and map every `operation_id` to its HTTP
method, path template, and whether it carries the `background` tag.

## Parameters

| Parameter | Type              |
| --------- | ----------------- |
| `apiSpec` | `OpenApiDocument` |

## Returns

[`OperationMap`](../type-aliases/OperationMap.md)
