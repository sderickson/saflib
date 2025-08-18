**@saflib/express**

***

# @saflib/express

Packages which implement express servers should import and use this package.

## Interfaces

| Interface | Description |
| ------ | ------ |
| [GlobalMiddlewareOptions](interfaces/GlobalMiddlewareOptions.md) | Options for creating global middleware. |
| [ScopedMiddlewareOptions](interfaces/ScopedMiddlewareOptions.md) | Options for creating scoped middleware. |
| [StartServerOptions](interfaces/StartServerOptions.md) | Options when starting an Express server. |

## Functions

| Function | Description |
| ------ | ------ |
| [createErrorMiddleware](functions/createErrorMiddleware.md) | Middleware which should be placed after all routes. |
| [createGlobalMiddleware](functions/createGlobalMiddleware.md) | Middleware which should be put at the top of the middleware stack, and run for every request. |
| [createHandler](functions/createHandler.md) | Wrapper for Express handlers. Promisifies the handler, ensuring any uncaught exceptions get passed to `next`. |
| [createScopedMiddleware](functions/createScopedMiddleware.md) | Middleware which should only be applied to a subset of routes in an express server. This middleware all depends on the OpenAPI spec for those routes. |
| [startExpressServer](functions/startExpressServer.md) | Given an Express app and options, starts the server and sets it up for graceful shutdown. |
