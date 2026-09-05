# Handlers

Handlers are the HTTP implementations of OpenAPI operations in `{service-name}-http` packages. Types come from the adjacent `{service-name}-spec` package.

Use the [express/add-handler](./workflows/add-handler.md) workflow to add new handlers.

**Route** (or **operation**) means the OpenAPI specification. **Handler** means the Express implementation.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/http) for file layout, router factories, and how handlers are mounted. Use the `express/add-handler` workflow to add new handlers.

Each handler is registered on an Express router with [`createOperationScopedMiddleware`](./ref/@saflib/express/functions/createScopedMiddleware.md) and the operation's `operationJsonSpec` from `@…-spec/operations/<operationId>`.

Wrap every handler with [`createHandler`](./ref/@saflib/express/functions/createHandler.md) so async errors reach Express error middleware.

## Typing

Spec packages export request and response types keyed by `operationId` and status code. Handlers should use these types so mismatches with the spec fail at compile time. See [@saflib/openapi](../../openapi/docs/01-overview.md).

OpenAPI validation runs in scoped middleware (`express-openapi-validator`, OpenAPI **3.1**). For nullable fields, see [API design — nullable fields](../../openapi/docs/02-api-design.md#nullable-fields-openapi-31).

## Layering

A typical request passes through layers in this order:

1. **Global middleware** — metrics, security headers, body parsing, CORS, etc. ([Middleware](./02-middleware.md))
2. **Service context** — request-scoped `AsyncLocalStorage` (database keys, clients, config)
3. **Early auth gate** — optional monolith-wide session check before product routers
4. **Scoped middleware** — OpenAPI validation, CSRF, context, structured logging, per-operation auth tags
5. **Handler** — maps domain results to HTTP responses
6. **Error middleware** — 404 and centralized error formatting after all routes

The handler is the only layer that should construct successful HTTP responses for an operation. Middleware handles cross-cutting concerns (auth, validation, logging); handlers handle HTTP semantics for that operation.

## Error handling

Handlers must account for every response status declared on the operation, except **401** (and other auth failures), which scoped auth middleware handles.

Do not wrap handlers in `try/catch`. Unsafe work should return errors per [best practices](../../best-practices.md#return-errors); map those to the appropriate status and body. Uncaught exceptions are handled by error middleware as **5xx**.

Handlers may signal errors in three ways:

1. `throw createError(...)` from [`http-errors`](https://www.npmjs.com/package/http-errors)
2. `next(err)` with an `http-errors` error
3. Respond directly: `res.status(code).json({ ... } satisfies ResponseBodyType)`

Most error responses should use the [standard error object](../../openapi/schemas/error.yaml). Options 1 and 2 only work when the operation's error responses reference that schema. For a custom error shape, use option 3.

`message` is for debugging and logging — not for end-user copy. Frontends and SDKs should use HTTP status and the `code` field. Pass `code` in the third argument to `createError`:

```ts
createError(400, "This file type is not supported", {
  code: "FILE_TYPE_NOT_SUPPORTED",
});
```
