[**@saflib/openapi**](../../index.md)

---

# Function: findUnknownOpenApiRouteFileTags()

> **findUnknownOpenApiRouteFileTags**(`packageRoot`): [`OpenApiTagViolation`](../type-aliases/OpenApiTagViolation.md)[]

Scan routes YAML under a spec package for unknown operation tags.
Prefer this in package tests; use [assertOpenApiOperationTags](assertOpenApiOperationTags.md) on the
bundled document at process startup.

## Parameters

| Parameter     | Type     |
| ------------- | -------- |
| `packageRoot` | `string` |

## Returns

[`OpenApiTagViolation`](../type-aliases/OpenApiTagViolation.md)[]
