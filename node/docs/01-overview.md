# Overview

`@saflib/node` provides shared runtime infrastructure for Node.js processes in SAF applications — request context, logging, metrics, error reporting, and internal identity assertions. HTTP servers, gRPC services, cron/job runners, CLIs, and tests all use the same [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage) stores and reporter helpers defined here.

Subsystem libraries ([`@saflib/express`](../../express/docs/01-overview.md), [`@saflib/grpc`](../../grpc/grpc/docs/01-overview.md), cron, jobs, …) wire context and reporters at operation boundaries. This package holds the core types, stores, and bootstrap helpers they share.

## What this package provides

- **Context** — [`SafContext`](./ref/index/interfaces/SafContext.md) in [`safContextStorage`](./ref/index/variables/safContextStorage.md); [`getSafContext`](./ref/index/functions/getSafContext.md) and [`getSafContextWithAuth`](./ref/index/functions/getSafContextWithAuth.md) for handlers and jobs
- **Reporters** — Winston logging and error collectors via [`SafReporters`](./ref/index/interfaces/SafReporters.md) and [`getSafReporters`](./ref/index/functions/getSafReporters.md)
- **Service bootstrap** — [`setServiceName`](./ref/index/functions/setServiceName.md), [`addTransport`](./ref/index/functions/addTransport.md), [`addErrorCollector`](./ref/index/functions/addErrorCollector.md), [`collectSystemMetrics`](./ref/index/functions/collectSystemMetrics.md)
- **Subsystem helpers** — [`createLogger`](./ref/index/functions/createLogger.md), [`makeSubsystemReporters`](./ref/index/functions/makeSubsystemReporters.md), [`generateRequestId`](./ref/index/functions/generateRequestId.md)
- **Internal auth** — [`signAssertion`](./ref/index/functions/signAssertion.md) / [`verifyAssertion`](./ref/index/functions/verifyAssertion.md) with [`configureInternalAssertionKeys`](./ref/index/functions/configureInternalAssertionKeys.md)
- **Subpath exports** — [`@saflib/node/env`](./ref/env/index.md) (package env vars), [`@saflib/node/git-hashes`](./ref/src/git-hashes/index.md) (build metadata), [`@saflib/node/cli-context`](./ref/src/cli-context/index.md) (re-exports `@saflib/commander` `setupContext`)

See [Instrumentation](./02-instrumentation.md) for how context, reporters, and metrics fit together in applications and subsystem libraries. API details: [code reference](./ref/index.md).

## Subsystems

Any request-scoped or long-running Node process should provide context and reporters at operation boundaries:

| Subsystem   | Typical provider                                                     |
| ----------- | -------------------------------------------------------------------- |
| HTTP        | `@saflib/express` middleware                                         |
| gRPC        | `@saflib/grpc` interceptors                                          |
| Cron / jobs | `@saflib/cron`, `@saflib/jobs` runners                               |
| CLI         | `@saflib/commander` `setupContext` (also `@saflib/node/cli-context`) |
| Tests       | stubs when `NODE_ENV=test` (see instrumentation doc)                 |

Product `{service}-common` packages hold service-specific dependencies (database clients, vendor SDKs) and pass them into each subsystem bootstrap. See [monorepo service layout](../../monorepo/docs/01-overview.md).

## Application startup

Call bootstrap functions once at process start, before initializing servers or workers:

1. [`setServiceName`](./ref/index/functions/setServiceName.md) — must match the service package name (without org prefix) and Docker service name
2. [`addTransport`](./ref/index/functions/addTransport.md) / [`addErrorCollector`](./ref/index/functions/addErrorCollector.md) — wire Winston and error reporting (e.g. Loki, Sentry)
3. [`collectSystemMetrics`](./ref/index/functions/collectSystemMetrics.md) — opt into Prometheus default metrics via `prom-client`

Handlers, jobs, and CLI commands then use `getSafContext`, `getSafReporters`, and related helpers — not raw `console.log` or ad hoc loggers.

## Tracing

SAF does not provide distributed tracing today. Logging, metrics, and error reporting cover most observability needs. The shared [`SafContext`](./ref/index/interfaces/SafContext.md) shape and subsystem boundary wrappers (Express handlers, Drizzle query wrappers, …) are designed so tracing spans could be added later without reshaping application code.
