# Overview

This library provides shared Express middleware, route handler utilities, and workflows for HTTP services in SAF applications.

These docs explain how consumers of `@saflib/express` should use this library within SAF applications.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/http). HTTP packages are mainly organized as adjacent `{service-name}-http` and `{service-name}-spec` packages; `@saflib/base-http` shows how global middleware, auth, platform routers, and product mounts are composed.

- [Middleware](./02-middleware.md) — global, scoped, and error middleware
- [Handlers](./03-routes.md) — OpenAPI operation implementations, layering, and error handling
- [Testing](./04-testing.md) — slim handler tests, integration gotchas, fixtures
