**@saflib/express**

***

# @saflib/express

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

[PreMiddlewareOptions](index/interfaces/PreMiddlewareOptions.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[StartServerOptions](index/interfaces/StartServerOptions.md)

</td>
<td>

&hyphen;

</td>
</tr>
</tbody>
</table>

## Variables

<table>
<thead>
<tr>
<th>Variable</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[auth](index/variables/auth.md)

</td>
<td>

Middleware that adds user information from headers to the request object.
Expects x-user-id, x-user-email, and x-user-scopes headers to be set by authentication layer.
Throws 401 if required headers are missing.

</td>
</tr>
<tr>
<td>

[corsRouter](index/variables/corsRouter.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[everyRequestLogger](index/variables/everyRequestLogger.md)

</td>
<td>

HTTP request logging middleware using Morgan.
Mainly used for debugging in development, not propagated to something like Loki in production.
Format: ":date[iso] <:id> :method :url :status :response-time ms - :res[content-length]"

</td>
</tr>
<tr>
<td>

[healthRouter](index/variables/healthRouter.md)

</td>
<td>

Health Check Router
Provides a basic health check endpoint for container orchestration
readiness/liveness probes

</td>
</tr>
<tr>
<td>

[metricsMiddleware](index/variables/metricsMiddleware.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[metricsRouter](index/variables/metricsRouter.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[notFoundHandler](index/variables/notFoundHandler.md)

</td>
<td>

404 Handler
Catches requests to undefined routes

</td>
</tr>
<tr>
<td>

[recommendedErrorHandlers](index/variables/recommendedErrorHandlers.md)

</td>
<td>

Recommended error handling middleware stack.
Should be used after all routes.
Includes:
1. 404 handler for undefined routes
2. Error handler for all other errors

</td>
</tr>
<tr>
<td>

[startExpressServer](index/variables/startExpressServer.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[unsafeRequestLogger](index/variables/unsafeRequestLogger.md)

</td>
<td>

For tracking requests which are "unsafe", that is they make some sort of change.
These are logged to Loki or whatever transport Winston is hooked up to.
They use OpenAPI operationIds to help label the request; these should always be set.

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

[createHandler](index/functions/createHandler.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[createHealthHandler](index/functions/createHealthHandler.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[createOpenApiValidator](index/functions/createOpenApiValidator.md)

</td>
<td>

Creates OpenAPI validation middleware with a custom specification.
Only use this if you need to validate against a different OpenAPI spec.

</td>
</tr>
<tr>
<td>

[createPreMiddleware](index/functions/createPreMiddleware.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[createScopeValidator](index/functions/createScopeValidator.md)

</td>
<td>

Creates middleware that validates user scopes against OpenAPI security requirements.
Expects the auth middleware to have run first so safContext is provided.
Throws 403 if user doesn't have required scopes.

</td>
</tr>
<tr>
<td>

[errorHandler](index/functions/errorHandler.md)

</td>
<td>

Error Handler
Central error handling middleware that logs errors and returns standardized error responses

</td>
</tr>
<tr>
<td>

[healthcheck](index/functions/healthcheck.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[~~startServer~~](index/functions/startServer.md)

</td>
<td>

**Deprecated**

use startExpressServer instead

</td>
</tr>
</tbody>
</table>
