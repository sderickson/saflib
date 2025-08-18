# Middleware

The `@saflib/express` package comes with a suite of standard middleware to provide a base level of features for all HTTP servers built on it. All middleware is stored in [the `middleware` directory](https://github.com/sderickson/saflib/tree/main/express/src/middleware). This document goes over them.

## Kinds of Middleware

Middleware fall into three categories:

- **Global** - this should be used at the top of any Express application, and applies to all routes.
- **Scoped** - Middleware scoped to routes for a given spec.
- **Error** - Is placed after all handlers, for unsuccessful responses. See [writing error handlers](https://expressjs.com/en/guide/error-handling.html#writing-error-handlers).

A good rule of thumb for determining if some middleware is Scoped or Global is whether it depends on the OpenAPI spec for the specific route or not. A single Express server may serve multiple specs (such as one specifically for the service, as well as other common ones like metrics and health checks), and so there can be multiple sets of scoped middleware, though there should only be one set of global or error middleware, and no route should go through more than one set of scoped middleware.

> TODO: Wrap "metrics" in "global" helper, move "cors", "blockHtml", and "helmet"... and probably a few others in there.

> TODO: Rename "pre" middleware to "scoped" middleware.

## Authentication, Authorization

Express applications in SAF assume authorization and authentication are handled by some separate service, and that headers passed in can be trusted to indicate under whose authority the requests are made. Specifically, it uses Caddy's [forward_auth](https://caddyserver.com/docs/caddyfile/directives/forward_auth) directive in conjunction with the identity service's [verify endpoint](https://github.com/sderickson/saflib/blob/main/identity/identity-spec/routes/auth/verify-auth.yaml), but a pattern like this could likely be set up by any reverse proxy.

The data passed in this way is limited. The only information the route is given is the user id and the scopes it has permission to use. More information about the user must be retrieved as-needed via gRPC.

> TODO: Remove email and email-verified headers from verifyAuth.

## Middleware

### `auth.ts`

**Type**: Scoped

The auth middleware checks the OpenAPI schema for the requested route and the auth object provided through the `forward_auth` headers to return 401s where appropriate. As such, it depends on both the `context.ts` and `openapi.ts` middleware.

If a route has a `no-auth` tag associated with it, it always passes the request through.

Otherwise, if the request is unauthenticated, the middleware returns 401.

When creating scoped middleware, `auth.ts` can be disabled, but it's on by default.

### `blockHtml.ts`

**Type**: Global

As a broad guard against scripting attacks, this simply checks if there are any HTML tags inside any of the body of the JSON submitted to the server, and returns 400 if it detects anything.

### `context.ts`

**Type**: Scoped

`@saflib/node` provides AsyncLocalStorage instances which can be depended on to provide stores within the context of any upstream system. The context middleware creates and provides that store to handlers.

> TODO: Link to documentation in @saflib/node

### `cors.ts`

**Type**: Global

The CORS middleware provides a simple guard to ensure only your site's subdomains may make requests to the API. It uses the `DOMAIN`, `PROTOCOL`, and `CLIENT_SUBDOMAINS` environment variables to only allow requests from those specific domains.

### `errors.ts`

**Type**: Error

Logs 5xx errors and returns all intercepted errors in the [standard error format](https://github.com/sderickson/saflib/blob/37d619bf41fe2922880dee7483b9fb9690d2ee1b/openapi/schemas/error.yaml).

### `express`

**Type**: Global

Built in Express middleware included: `json` and `urlencoded`.

### `helmet`

**Type**: Global

Basic safety measure: the [helmet](https://www.npmjs.com/package/helmet) middleware.

### `httpLogger.ts`

**Type**: Global, Scoped

Provides two middleware: a global logger for every request (which prints out to console via `morgan`) and a scoped logger for every unsafe request, logging those to the standard logger provided by `@saflib/node`, which in practice is Winston, being sent to Loki.

### `metrics.ts`

**Type**: Global

Provides a router and middleware. The middleware records RED metrics for every route, and the router serves the `/metrics` endpoint in the Prometheus [text format](https://prometheus.io/docs/instrumenting/exposition_formats/#text-format-example).

This middleware depends on [express-prom-bundle](https://github.com/jochen-schweizer/express-prom-bundle) since it does exactly what is needed, no more, no less.

### `openapi.ts`

**Type**: Scoped

Provided a spec, this creates middleware which will validate requests and responses to check they conform with the spec. For convenience, it will also log validation errors in responses to the console for tests, since that's when those errors show up the most. It uses [express-openapi-validator](https://www.npmjs.com/package/express-openapi-validator) which also attaches `openapi` to the request which can be referenced by downstream middleware and handlers.

### `scopes.ts`

**Type**: Scoped

Checks the OpenAPI spec against the user's auth and returns 403 if the user may not access this resource. In theory, SAF fully supports scopes, where they can be defined as part of the spec and enforced through this middleware, but in practice it really supports three levels of authority: none, user, and admin (which has the `"*"` scope). So far I haven't needed anything more granular than that, but I'm confident the current system can be extended fairly easily to give scopes more full-fledged support.
