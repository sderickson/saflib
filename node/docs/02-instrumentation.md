# Instrumentation

For basic observability of web applications, SAF provides the logic for:

- Logging
- Metrics
- Error reporting

All SAF-provided libraries support these systems, and this library provides all the tools for new systems to do the same.

**Tracing** is the one major area of instrumentation that SAF does not provide. That's mostly due to the other three being simpler to set up and mostly sufficient. Still, SAF is designed in a way where tracing can be added, in particular by enforcing a consistent context definition (through this library) and using wrapping functions in libraries such as [`@saflib/express`](../../express/docs/ref/functions/createHandler.md) and [`@saflib/drizzle-sqlite`](../../drizzle-sqlite3/docs/ref/functions/queryWrapper.md) where spans can be systematically added at package boundaries.

## Stores

Instrumentation makes heavy use of Node's [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#asynclocalstorage) to store context and reporters.

### Context

Context is information about what is currently running, in what environment. Any subsystem is expected to provide this context, and it can be used to:

- Affect behavior of the operation, mainly through the `auth` field
- Add context to instrumentation, which is basically every other field

See [`SafContext`](./ref/interfaces/SafContext.md) for more details (storage: [`safContextStorage`](./ref/variables/safContextStorage.md)).

### Reporters

Reporters are functions for reporting telemetry to various services. They depend on the context, and are not serializable, so these are kept in a separate `AsyncLocalStorage` instance.

The main functions to use are:

- [`log`](./ref/interfaces/SafReporters.md#log) - a [Winston](https://github.com/winstonjs/winston/tree/2.x) logger which applications can add transports to.
- [`logError`](./ref/interfaces/SafReporters.md#logerror) - a convenience function for logging `Error` objects. It logs to both `log` and any `ErrorReporter` callbacks (so errors appear both in logging systems like Loki and error reporting services like Sentry).

See [`SafReporters`](./ref/interfaces/SafReporters.md) for more details (storage: [`safReportersStorage`](./ref/variables/safReportersStorage.md)).

## Use in Applications

The main functions to use inside HTTP handlers, gRPC handlers, cron jobs, and alike are:

- [`getSafContext`](./ref/functions/getSafContext.md)
- [`getSafContextWithAuth`](./ref/functions/getSafContextWithAuth.md)
- [`getSafReporters`](./ref/functions/getSafReporters.md)

Use these for _all_ logging and auth purposes. They will error if the application has not provided them, and what they return is typed to be what you should expect. These are mainly to avoid existence-check boilerplate, otherwise you could also just use [`safContextStorage`](./ref/variables/safContextStorage.md) and [`safReportersStorage`](./ref/variables/safReportersStorage.md)'s [`getStore`](https://nodejs.org/api/async_context.html#asynclocalstoragegetstore) methods directly.

### Logging and Testing

By design, these helper functions will error if context and reporters have not been provided by the application, but the application may not be in the mix if you're testing smaller pieces in isolation. So these functions will return stubs if and only if the `NODE_ENV` environment variable is `test`. It will also log errors to console so they show up in test output.

If you want to check that certain logs are being made in tests, you can use `getSafReporters` to get the universal loggers and spy on them. See [`@saflib/cron`'s unit tests for example](https://github.com/sderickson/saflib/blob/main/cron/cron/src/index.test.ts).

## Integrate Logging

When you set up a new service, you will need to integrate logging with your chosen collectors or external services and do some other setup.

- [`setServiceName`](./ref/functions/setServiceName.md) - sets the service name, which is used to identify the service in logs and metrics. The service name should match the service package name (minus any organization prefix) and the docker image/service name, for consistency.
- [`addErrorCollector`](./ref/functions/addErrorCollector.md) - adds a callback for when errors are reported by the application. Callbacks receive a [`ErrorCollectorParam`](./ref/interfaces/ErrorCollectorParam.md) object, which is based off Sentry's `captureContext` parameter for [captureContext](https://docs.sentry.io/platforms/javascript/guides/node/apis/#captureException)
- [`addTransport`](./ref/functions/addTransport.md) - adds a [Winston transport](https://github.com/winstonjs/winston/blob/2.4.0/docs/transports.md) to the `log` logger.
- [`collectSystemMetrics`](./ref/functions/collectSystemMetrics.md) - opts into [`prom-client`](https://github.com/siimon/prom-client?tab=readme-ov-file#default-metrics)'s default metrics, which are a superset of Prometheus's recommended metrics.

Call all these before initializing any servers or other long-running processes, and start with `setServiceName` since any `log` calls will fail without one.

If you have some service-specific context (which is likely, especially for shared clients to databases and other services), you should put those in a sibling `{service-name}-common` package and provide them to each of your subsystems. Some, such as `@saflib/grpc`, provide helpers for this.

## Provide Context and Reporters

It's the job of subsystem libraries such as `@saflib/express` and `@saflib/grpc` to provide context and reporters for each operation. They can do this preferably with the [`safContextStorage`](./ref/variables/safContextStorage.md) and [`safReportersStorage`](./ref/variables/safReportersStorage.md)'s [`run`](https://nodejs.org/api/async_context.html#asynclocalstoragerunstore-callback-args) method.

They should use the following functions and variables:

- [`createLogger`](./ref/functions/createLogger.md) to create a Winston logger. Provide `subsystemName` and `operationName`. To do this, a logger will have to be created for each "request" or "run".
- [`generateRequestId`](./ref/functions/generateRequestId.md). Only needed if not provided by the caller, which it should be if the operation does not originate from the subsystem itself such as for cron jobs.
- [`safContextStorage`](./ref/variables/safContextStorage.md) and [`safReportersStorage`](./ref/variables/safReportersStorage.md) to provide a context. Use `run` method ideally, or `enterWith` if necessary.
- [`defaultErrorReporter`](./ref/variables/defaultErrorReporter.md) for a standard error reporter.
- [`makeSubsystemReporters`](./ref/functions/makeSubsystemReporters.md) when you want to log outside of an operation, such as when initializing a subsystem.

See examples throughout [`@saflib`](https://github.com/search?q=repo%3Asderickson%2Fsaflib%20safReportersStorage.run&type=code).
