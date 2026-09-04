# Overview

`node-log` provides **development-only** tooling for inspecting Winston logs from running Node services. In development, `@saflib/node` attaches an in-memory ring-buffer transport so logs are available in the admin SPA and Vue DevTools without flooding the terminal.

Production logging still flows through Winston transports you configure at startup (Loki, files, etc.). This suite is the dev viewer and SSE/streaming layer.

## What this suite provides

- **`node-log-spec`** — OpenAPI contract for listing and streaming dev logs
- **`node-log-http`** — in-memory log buffer, Winston transport, Express router (`enableDevLogBuffer`, `createDevLogBufferTransport`, `createDevLogsRouter`)
- **`node-log-sdk`** — TanStack Query client hooks for the admin UI
- **`node-log-vue`** — Admin SPA page and DevTools integration for browsing buffered logs

## Integration

[`@saflib/node`](../../node/docs/01-overview.md) calls `enableDevLogBuffer` and adds `createDevLogBufferTransport()` automatically when `DEPLOYMENT_NAME=development`. The HTTP app mounts `createDevLogsRouter()` for paginated log listing and live streaming.

See [node instrumentation — Testing observability in development](../../node/docs/02-instrumentation.md#testing-observability-in-development).

## Naming

The `node-` prefix marks **server-process** Winston logging. Browser console logging and client-side analytics live elsewhere. The Vue packages are admin viewers (and DevTools tabs) for server logs, not a general browser logging framework.
