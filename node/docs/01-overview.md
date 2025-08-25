# Overview

This package provides logic common across any subsystem which might run in Node.

Possible subsystems include:

- HTTP server
- gRPC server
- Cron runner
- Async job runner
- CLI tool
- Test runner

Basically, it's the general context in which any logic is running. It may be part of an external request, an internal request, an independent process, or completely outside of any production service.

What this ends up being mostly is _instrumentation_ and _higher-order workflows_.

For instrumentation, this library provides tools for:

- Free-form logging, such as for **Loki**
- Metrics collection, such as for **Prometheus**
- Error reporting, such as for **Sentry**

In addition, it is where `AsyncLocalStorage` instances are created and provided, along with helper functions for code to easily access them.

For workflows, this library is for creating new services which run Node.js. Currently, no workflows have been written, but this is where they'll be.
