# Overview

`@saflib/notify` provides in-process change-event pub/sub and Server-Sent Events (SSE) framing helpers for Node HTTP services.

## What this package provides

- **`ChangeEmitter` / `InProcessChangeEmitter`** — org-scoped publish/subscribe with a small ring buffer for `Last-Event-ID` reconnect replay. Transport-agnostic today (in-process); intended for coarse “something changed” hints keyed by OpenAPI `operation_id`, not payload bodies.
- **SSE utilities** — `writeSseEvent`, `writeSseComment`, `validateSseOrigin`, plus shared connection limits (`SSE_MAX_CONNECTION_MS`, `SSE_HEARTBEAT_INTERVAL_MS`).

## Integration

[`@saflib/node-log-http`](../node-log/docs/01-overview.md) uses the SSE helpers in `stream-dev-logs.ts` to stream development Winston logs to the admin SPA and Vue DevTools.

Product code can publish `ChangeEvent` objects when writes complete and expose org-scoped SSE routes that replay from `InProcessChangeEmitter.getEventsAfter`. Wire format and origin checks should use the shared SSE helpers for consistency.