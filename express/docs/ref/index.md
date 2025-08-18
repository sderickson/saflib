**@saflib/express**

***

# @saflib/express

Packages which implement express servers should import and use this package.

## Interfaces

<table>
<thead>
<tr>
<th>Interface</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[GlobalMiddlewareOptions](interfaces/GlobalMiddlewareOptions.md)

</td>
<td>

Options for creating global middleware.

</td>
</tr>
<tr>
<td>

[ScopedMiddlewareOptions](interfaces/ScopedMiddlewareOptions.md)

</td>
<td>

Options for creating scoped middleware.

</td>
</tr>
<tr>
<td>

[StartServerOptions](interfaces/StartServerOptions.md)

</td>
<td>

Options when starting an Express server.

</td>
</tr>
</tbody>
</table>

## Functions

<table>
<thead>
<tr>
<th>Function</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[createErrorMiddleware](functions/createErrorMiddleware.md)

</td>
<td>

Middleware which should be placed after all routes.

</td>
</tr>
<tr>
<td>

[createGlobalMiddleware](functions/createGlobalMiddleware.md)

</td>
<td>

Middleware which should be put at the top of the middleware stack, and run
for every request.

</td>
</tr>
<tr>
<td>

[createHandler](functions/createHandler.md)

</td>
<td>

Wrapper for Express handlers. Promisifies the handler, ensuring any uncaught
exceptions get passed to `next`.

</td>
</tr>
<tr>
<td>

[createScopedMiddleware](functions/createScopedMiddleware.md)

</td>
<td>

Middleware which should only be applied to a subset of routes in an express server.
This middleware all depends on the OpenAPI spec for those routes.

</td>
</tr>
<tr>
<td>

[startExpressServer](functions/startExpressServer.md)

</td>
<td>

Given an Express app and options, starts the server and sets it up for graceful shutdown.

</td>
</tr>
</tbody>
</table>
