# Overview

This library provides shared Express middleware, route handler utilities, and workflows for HTTP services in SAF applications.

These docs explain how consumers of `@saflib/express` should use this library within SAF applications.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service). A product's HTTP code is split three ways:

- **Feature http packages** (`service/http`, `<offshoot>/http`, kind `http`) each export one router (`createBaseRouter()`, `create<Offshoot>Router()`) built from their handler groups.
- **The `http-app` package** (`service/http-app`, kind `http-app`) builds the app shell with `createProductHttpApp`: global middleware, the service context, the auth gate, the audit recorder, and platform routers (audit, jobs, cron) after the feature routers.
- **The composition root** (`service/monolith`, kind `app`) passes every feature router and the reviewed public-route list to the `http-app` package and starts the server.

- [Middleware](./02-middleware.md) — global, scoped, and error middleware
- [Handlers](./03-routes.md) — OpenAPI operation implementations, layering, and error handling
- [Testing](./04-testing.md) — slim handler tests, integration gotchas, fixtures
