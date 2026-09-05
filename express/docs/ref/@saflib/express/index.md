[**@saflib/express**](../../index.md)

---

# @saflib/express

Packages which implement express servers should import and use this package.

## Interfaces

| Interface                                                                              | Description                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [AuthMiddlewareOptions](interfaces/AuthMiddlewareOptions.md)                           | -                                                                                           |
| [CreateChangeEventMiddlewareOptions](interfaces/CreateChangeEventMiddlewareOptions.md) | -                                                                                           |
| [CreateInternalCallerOptions](interfaces/CreateInternalCallerOptions.md)               | -                                                                                           |
| [GlobalMiddlewareOptions](interfaces/GlobalMiddlewareOptions.md)                       | Options for creating global middleware.                                                     |
| [InternalCaller](interfaces/InternalCaller.md)                                         | -                                                                                           |
| [InternalCallerRequest](interfaces/InternalCallerRequest.md)                           | -                                                                                           |
| [ScopedMiddlewareOptions](interfaces/ScopedMiddlewareOptions.md)                       | Options for creating scoped middleware.                                                     |
| [StartedExpressServer](interfaces/StartedExpressServer.md)                             | -                                                                                           |
| [StartServerOptions](interfaces/StartServerOptions.md)                                 | Options when starting an Express server. At least one of `port` / `socketPath` is required. |

## Variables

| Variable                                                | Description |
| ------------------------------------------------------- | ----------- |
| [uploadToDiskOptions](variables/uploadToDiskOptions.md) | -           |

## Functions

| Function                                                                        | Description                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createChangeEventMiddleware](functions/createChangeEventMiddleware.md)         | After a successful non-read response, publish a ChangeEvent for the org. Mount after OpenAPI binding so `req.openapi.schema.operationId` is set. Covers both foreground requests and internal job deliveries on the same app. |
| [createDevAnalyticsRouter](functions/createDevAnalyticsRouter.md)               | Development-only in-memory product event buffer: - `POST /product-events/record` — browser event capture into the ring buffer - `GET /admin/product-events` — ring buffer listing for the admin SPA                           |
| [createDevErrorsRouter](functions/createDevErrorsRouter.md)                     | Development-only mock error routes (ring buffer): - `POST /errors/record` — browser client error capture - `GET /admin/errors` — ring buffer listing (site-admin-only)                                                        |
| [createDevLogsRouter](functions/createDevLogsRouter.md)                         | Development-only Winston log viewer: - `GET /dev/logs` — JSON snapshot of the in-memory ring buffer - `GET /dev/logs/stream` — SSE of new (and optionally replayed) log entries                                               |
| [createErrorMiddleware](functions/createErrorMiddleware.md)                     | Middleware which should be placed after all routes.                                                                                                                                                                           |
| [createErrorsRouter](functions/createErrorsRouter.md)                           | Production error routes (always mounted): - `POST /csp-violations` — browser CSP reports - `POST /admin/test-error` — intentional server error (site-admin-only)                                                              |
| [createGlobalMiddleware](functions/createGlobalMiddleware.md)                   | Middleware which should be put at the top of the middleware stack, and run for every request.                                                                                                                                 |
| [createHandler](functions/createHandler.md)                                     | Wrapper for Express handlers. Promisifies the handler, ensuring any uncaught exceptions get passed to `next`.                                                                                                                 |
| [createInternalCaller](functions/createInternalCaller.md)                       | Creates a low-level fetch-compatible client that signs a per-request identity assertion and dispatches over a unix domain socket.                                                                                             |
| [createInternalMiddleware](functions/createInternalMiddleware.md)               | Middleware for internal-only service endpoints.                                                                                                                                                                               |
| [createOperationScopedMiddleware](functions/createOperationScopedMiddleware.md) | Scoped middleware for a single OpenAPI operation fragment (from `@<org>/<spec>/operations/<operationId>`).                                                                                                                    |
| [createScopedMiddleware](functions/createScopedMiddleware.md)                   | Middleware which should only be applied to a subset of routes in an express server. This middleware all depends on the OpenAPI spec for those routes.                                                                         |
| [drainRequest](functions/drainRequest.md)                                       | Drain the request body so the client can finish sending (e.g. multipart upload). Call before sending 401/403 to avoid EPIPE when the client closes after receiving the response while the body was still streaming.           |
| [isInternalRequest](functions/isInternalRequest.md)                             | Returns whether `req` was tagged by [markInternal](functions/markInternal.md). Safe to call on any IncomingMessage; returns false when the tag is absent.                                                                     |
| [makeAdminHeaders](functions/makeAdminHeaders.md)                               | -                                                                                                                                                                                                                             |
| [makeAssertionHeaders](functions/makeAssertionHeaders.md)                       | Signs an identity assertion for use in tests via `X-Saf-Identity-Assertion`.                                                                                                                                                  |
| [makeAuthMiddleware](functions/makeAuthMiddleware.md)                           | -                                                                                                                                                                                                                             |
| [makeContextMiddleware](functions/makeContextMiddleware.md)                     | -                                                                                                                                                                                                                             |
| [makeCsrfMiddleware](functions/makeCsrfMiddleware.md)                           | Enforce CSRF double-submit token validation on state-changing requests.                                                                                                                                                       |
| [makeCsrfTokenMiddleware](functions/makeCsrfTokenMiddleware.md)                 | -                                                                                                                                                                                                                             |
| [makeUserHeaders](functions/makeUserHeaders.md)                                 | -                                                                                                                                                                                                                             |
| [markInternal](functions/markInternal.md)                                       | Wraps an HTTP request listener (e.g. an Express app) so each request is tagged as internal via a non-enumerable, process-local Symbol property before the underlying app handles it.                                          |
| [noStoreCacheControl](functions/noStoreCacheControl.md)                         | Disallow storing responses in shared or private caches. Use for APIs that return session-, tenant-, or user-specific data (RFC 7234).                                                                                         |
| [startExpressServer](functions/startExpressServer.md)                           | Given an Express app and options, starts the server and sets it up for graceful shutdown.                                                                                                                                     |

## References

### fetchKratosIdentityById

Re-exports [fetchKratosIdentityById](../../src/kratos-admin/functions/fetchKratosIdentityById.md)

---

### kratosAdminBaseUrl

Re-exports [kratosAdminBaseUrl](../../src/kratos-admin/functions/kratosAdminBaseUrl.md)

---

### resolveAuthFromIdentityId

Re-exports [resolveAuthFromIdentityId](../../src/resolveAuthFromIdentityId/functions/resolveAuthFromIdentityId.md)

---

### resolveEmailFromIdentityId

Re-exports [resolveEmailFromIdentityId](../../src/kratos-admin/functions/resolveEmailFromIdentityId.md)

---

### resolveUserIdByEmail

Re-exports [resolveUserIdByEmail](../../src/kratos-admin/functions/resolveUserIdByEmail.md)
