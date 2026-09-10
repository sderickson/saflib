# Overview

`@saflib/vendors-loki` adds a [Grafana Loki](https://grafana.com/oss/loki/) Winston transport for shipping operational logs from [`@saflib/node`](../../../node/docs/01-overview.md) services.

## What this package provides

- **`addLokiTransport()`** — registers a `winston-loki` transport on the process `log` logger with JSON formatting and `service_name` labels

## Integration

Call `addLokiTransport()` during service bootstrap **after** [`setServiceName`](../../../node/docs/ref/index/functions/setServiceName.md) and alongside other [`addTransport`](../../../node/docs/02-instrumentation.md) calls. If hostname/port are unset, logs a warning and skips Loki (local dev continues with the dev log buffer only).

Environment (see `env.schema.json`):

- **`LOKI_HOSTNAME`** — Loki host (e.g. `loki`)
- **`LOKI_PORT`** — Loki port (e.g. `3100`)

Development log viewing uses [`@saflib/node-log`](../../../node-log/docs/01-overview.md); Loki is for production log aggregation.
