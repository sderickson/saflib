[**@saflib/express**](../../../index.md)

---

# Function: createOperationScopedMiddleware()

> **createOperationScopedMiddleware**(`apiSpec`, `options`): `Handler`[]

Scoped middleware for a single OpenAPI operation fragment (from `@<org>/<spec>/operations/<operationId>`).

## Parameters

| Parameter | Type                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| `apiSpec` | `OpenApiDocument`                                                                            |
| `options` | `Omit`\<[`ScopedMiddlewareOptions`](../interfaces/ScopedMiddlewareOptions.md), `"apiSpec"`\> |

## Returns

`Handler`[]
