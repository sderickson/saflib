[**@saflib/express**](../index.md)

***

# Function: createScopedMiddleware()

> **createScopedMiddleware**(`options`): `Handler`[]

Middleware which should only be applied to a subset of routes in an express server.
This middleware all depends on the OpenAPI spec for those routes.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

[`ScopedMiddlewareOptions`](../interfaces/ScopedMiddlewareOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Handler`[]
