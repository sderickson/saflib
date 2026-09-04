# Instrumentation

For basic observability of web applications, SAF provides the logic for:

- Logging
- Metrics
- Error reporting
- Product events (analytics)

All SAF-provided libraries support these systems, and this library provides all the tools for new systems to do the same.

While this package provides logic for cross-cutting instrumentation concerns, interfaces and integrations for these systems are in other packages:

- **Metrics (dev admin)** — [node-metrics](../../node-metrics/docs/01-overview.md): in-process Prometheus snapshot parsing and admin viewing. Runtime collection stays here via [`collectSystemMetrics`](./ref/index/functions/collectSystemMetrics.md) and subsystem histograms.
- **Logs (dev admin)** — [node-log](../../node-log/docs/01-overview.md): Winston ring buffer, dev HTTP routes, and admin/DevTools viewers. `@saflib/node` enables the buffer transport automatically in development.
- **Errors (browser + server)** — [errors](../../errors/docs/01-overview.md): reported-error storage, CSP/client ingestion, and admin UI. Hooks into [`addErrorCollector`](./ref/index/functions/addErrorCollector.md) / [`logError`](./ref/index/interfaces/SafReporters.md#logerror).
- **Product events (browser + server)** — [analytics](../../analytics/docs/01-overview.md): product event buffer, client logger, server typed analytics, and admin Events page.

**Tracing** is the one major area of instrumentation that SAF does not provide. That's mostly due to the other four being simpler to set up and mostly sufficient. Still, SAF is designed in a way where tracing can be added, in particular by enforcing a consistent context definition (through this library) and using wrapping functions in libraries such as [`@saflib/express`](../../express/docs/ref/@saflib/express/functions/createHandler.md) and [`@saflib/drizzle`](../../drizzle/docs/ref/index/functions/queryWrapper.md) where spans can be systematically added at package boundaries.

## Stores

Instrumentation makes heavy use of Node's [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#asynclocalstorage) to store context and reporters.

### Context

Context is information about what is currently running, in what environment. Any subsystem is expected to provide this context, and it can be used to:

- Affect behavior of the operation, mainly through the `auth` field
- Add context to instrumentation, which is basically every other field

See [`SafContext`](./ref/index/interfaces/SafContext.md) for more details (storage: [`safContextStorage`](./ref/index/variables/safContextStorage.md)).

### Reporters

Reporters are functions for reporting telemetry to various services. They depend on the context, and are not serializable, so these are kept in a separate `AsyncLocalStorage` instance.

The main functions to use are:

- [`log`](./ref/index/interfaces/SafReporters.md#log) - a [Winston](https://github.com/winstonjs/winston/tree/2.x) logger which applications can add transports to.
- [`logError`](./ref/index/interfaces/SafReporters.md#logerror) - a convenience function for logging `Error` objects. It logs to both `log` and any `ErrorReporter` callbacks (so errors appear both in logging systems like Loki and error reporting services like Sentry).

See [`SafReporters`](./ref/index/interfaces/SafReporters.md) for more details (storage: [`safReportersStorage`](./ref/index/variables/safReportersStorage.md)).

## Use in Applications

The main functions to use inside HTTP handlers, gRPC handlers, cron jobs, and alike are:

- [`getSafContext`](./ref/index/functions/getSafContext.md)
- [`getSafContextWithAuth`](./ref/index/functions/getSafContextWithAuth.md)
- [`getSafReporters`](./ref/index/functions/getSafReporters.md)

Use these for _all_ logging and auth purposes. They will error if the application has not provided them, and what they return is typed to be what you should expect. These are mainly to avoid existence-check boilerplate, otherwise you could also just use [`safContextStorage`](./ref/index/variables/safContextStorage.md) and [`safReportersStorage`](./ref/index/variables/safReportersStorage.md)'s [`getStore`](https://nodejs.org/api/async_context.html#asynclocalstoragegetstore) methods directly.

### Logging and Testing

By design, these helper functions will error if context and reporters have not been provided by the application, but the application may not be in the mix if you're testing smaller pieces in isolation. So these functions will return stubs if and only if the `NODE_ENV` environment variable is `test`. It will also log errors to console so they show up in test output.

If you want to check that certain logs are being made in tests, you can use `getSafReporters` to get the universal loggers and spy on them. See [`@saflib/cron-http`'s unit tests for example](https://github.com/sderickson/saflib/blob/main/cron/cron-http/src/index.test.ts).

## Integrate Logging

When you set up a new service, you will need to integrate logging with your chosen collectors or external services and do some other setup.

- [`setServiceName`](./ref/index/functions/setServiceName.md) - sets the service name, which is used to identify the service in logs and metrics. The service name should match the service package name (minus any organization prefix) and the docker image/service name, for consistency.
- [`addErrorCollector`](./ref/index/functions/addErrorCollector.md) - adds a callback for when errors are reported by the application. Callbacks receive a [`ErrorCollectorParam`](./ref/index/interfaces/ErrorCollectorParam.md) object, which is based off Sentry's `captureContext` parameter for [captureContext](https://docs.sentry.io/platforms/javascript/guides/node/apis/#captureException)
- [`addTransport`](./ref/index/functions/addTransport.md) - adds a [Winston transport](https://github.com/winstonjs/winston/blob/2.4.0/docs/transports.md) to the `log` logger.
- [`collectSystemMetrics`](./ref/index/functions/collectSystemMetrics.md) - opts into [`prom-client`](https://github.com/siimon/prom-client?tab=readme-ov-file#default-metrics)'s default metrics, which are a superset of Prometheus's recommended metrics.

Call all these before initializing any servers or other long-running processes, and start with `setServiceName` since any `log` calls will fail without one.

### Vendor implementations (logging)

Production log shipping uses vendor Winston transports:

- [`@saflib/vendors-loki`](../../vendors/loki/docs/01-overview.md) — Grafana Loki log shipping

If you have some service-specific context (which is likely, especially for shared clients to databases and other services), you should put those in a sibling `{service-name}-common` package and provide them to each of your subsystems. Some, such as `@saflib/grpc`, provide helpers for this.

## Provide Context and Reporters

It's the job of subsystem libraries such as `@saflib/express` and `@saflib/grpc` to provide context and reporters for each operation. They can do this preferably with the [`safContextStorage`](./ref/index/variables/safContextStorage.md) and [`safReportersStorage`](./ref/index/variables/safReportersStorage.md)'s [`run`](https://nodejs.org/api/async_context.html#asynclocalstoragerunstore-callback-args) method.

They should use the following functions and variables:

- [`createLogger`](./ref/index/functions/createLogger.md) to create a Winston logger. Provide `subsystemName` and `operationName`. To do this, a logger will have to be created for each "request" or "run".
- [`generateRequestId`](./ref/index/functions/generateRequestId.md). Only needed if not provided by the caller, which it should be if the operation does not originate from the subsystem itself such as for cron jobs.
- [`safContextStorage`](./ref/index/variables/safContextStorage.md) and [`safReportersStorage`](./ref/index/variables/safReportersStorage.md) to provide a context. Use `run` method ideally, or `enterWith` if necessary.
- [`defaultErrorReporter`](./ref/index/variables/defaultErrorReporter.md) for a standard error reporter.
- [`makeSubsystemReporters`](./ref/index/functions/makeSubsystemReporters.md) when you want to log outside of an operation, such as when initializing a subsystem.

See examples throughout [`@saflib`](https://github.com/search?q=repo%3Asderickson%2Fsaflib%20safReportersStorage.run&type=code).

## Recording Metrics

Metrics should be recorded through subsystem libraries as well, using [`prom-client`](https://github.com/siimon/prom-client). `@saflib/express` uses [`express-prom-bundle`](https://github.com/jochen-schweizer/express-prom-bundle) to record metrics for HTTP requests, and the other SAF libraries use `prom-client` directly to provide a similar histogram metric. See [examples](https://github.com/search?q=repo%3Asderickson%2Fsaflib%20client.Histogram&type=code).

Beyond these basic RED metrics, SAF application code does not currently provide any other guidance or built-in metrics for back-end, but there's certainly room for more, potentially through traces and finite state machines.

## Testing Observability in Development

SAF comes with a suite of simple observability tools for use in development. When running the dev server and the repo is set up the way [base](../../base/docs/01-overview.md) is, you can go to the admin SPA and view logs, metrics, errors, and events that have occurred since the server was started. These are kept in memory, and their interfaces included, only in development. This way you don't need to run an entire observability stack or rely on keys to actual services in order to use or develop product or engineering instrumentation.

Server logs are also integrated into the Vue developer tools. Winston logs are mostly filtered out of the terminal in development to avoid noise, so to make them easily accessible (along with any metadata sent with the log message), you can open the vue dev tools on any page and access Winston logs through one of the tabs.