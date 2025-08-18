[**@saflib/express**](../index.md)

***

# Function: createScopedMiddleware()

> **createScopedMiddleware**(`options`): `Handler`[]

Middleware which should only be applied to a subset of routes in an express server.
This middleware all depends on the OpenAPI spec for those routes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ScopedMiddlewareOptions`](../interfaces/ScopedMiddlewareOptions.md) |

## Returns

`Handler`[]
