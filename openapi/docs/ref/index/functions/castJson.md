[**@saflib/openapi**](../../index.md)

---

# Function: castJson()

> **castJson**(`json`): [`OpenApiDocument`](../type-aliases/OpenApiDocument.md)

Takes an imported JSON object and casts it to [OpenApiDocument](../type-aliases/OpenApiDocument.md) so that
express-openapi-validator can validate the JSON against the OpenAPI spec without
complaining about a type mismatch.

## Parameters

| Parameter      | Type                        |
| -------------- | --------------------------- |
| `json`         | \{ `default`: `unknown`; \} |
| `json.default` | `unknown`                   |

## Returns

[`OpenApiDocument`](../type-aliases/OpenApiDocument.md)
