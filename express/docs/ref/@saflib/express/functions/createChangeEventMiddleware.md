[**@saflib/express**](../../../index.md)

---

# Function: createChangeEventMiddleware()

> **createChangeEventMiddleware**(`options`): `Handler`

After a successful non-read response, publish a ChangeEvent for the org.
Mount after OpenAPI binding so `req.openapi.schema.operationId` is set.
Covers both foreground requests and internal job deliveries on the same app.

## Parameters

| Parameter | Type                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| `options` | [`CreateChangeEventMiddlewareOptions`](../interfaces/CreateChangeEventMiddlewareOptions.md) |

## Returns

`Handler`
