# Overview

`node-metrics` provides **development-only** tooling for inspecting in-process Prometheus metrics. Production services still expose `/metrics` for Prometheus/Grafana; this suite parses that text format in memory and surfaces it through admin HTTP routes and the admin SPA.

Core runtime metrics collection lives in [`@saflib/node`](../../node/docs/01-overview.md) (`collectSystemMetrics`, subsystem histograms). This suite is the dev viewer layer on top.

## What this suite provides

- **`node-metrics-spec`** — OpenAPI contract for the metrics snapshot admin route
- **`node-metrics-http`** — Express router and Prometheus text parser (`parsePromText`, `createMetricsRouter`)
- **`node-metrics-sdk`** — TanStack Query client hooks for the admin UI
- **`node-metrics-vue`** — Admin SPA page for browsing parsed metrics

## Integration

When the repo follows [base/service/http](../../base/docs/01-overview.md), the HTTP app mounts `createMetricsRouter()` in development. The admin SPA uses `@saflib/node-metrics-vue` to fetch `/admin/metrics/snapshot` and display metric families in a table.

No external observability stack or cloud keys are required for local development — metrics stay in the running Node process until scraped by this tooling or by production Prometheus.
