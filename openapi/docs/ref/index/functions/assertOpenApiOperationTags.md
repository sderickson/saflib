[**@saflib/openapi**](../../index.md)

---

# Function: assertOpenApiOperationTags()

> **assertOpenApiOperationTags**(`apiSpec`): `void`

Throw if any operation uses a tag outside [OPENAPI_ENFORCED_TAGS](../variables/OPENAPI_ENFORCED_TAGS.md).
Call at startup when loading a product OpenAPI document (and from package tests).

## Parameters

| Parameter | Type            |
| --------- | --------------- |
| `apiSpec` | `LooseDocument` |

## Returns

`void`
