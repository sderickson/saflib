# Overview

`@saflib/vitest` provides a **shared Vitest preset** for Node-oriented SAF libraries and HTTP services — default config, global test setup, and optional import-graph reporting.

**Vue SPAs** use [`@saflib/vue`](../../vue/docs/04-testing.md) instead (`@saflib/vue/vitest-config` — jsdom, Vuetify, MSW-friendly timeouts, SPA coverage rules). This package targets packages that run tests in the **Node** environment.

Code reference: [`docs/ref/`](./ref/index.md) · CLI: [`test-coverage`](./cli/test-coverage.md).

## Quick start

Add `@saflib/vitest` as a dev dependency and re-export the base config:

```javascript
// vitest.config.js
import { defaultConfig } from "@saflib/vitest/vitest.config.js";

export default defaultConfig;
```

Golden examples: [`utils/vitest.config.js`](../../utils/vitest.config.js), [`openapi/vitest.config.js`](../../openapi/vitest.config.js), [`commander/vitest.config.js`](../../commander/vitest.config.js).

## Exports

| Export                                    | Role                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@saflib/vitest/vitest.config.js`         | [`defaultConfig`](../../vitest/base-vitest.config.js) — shared Vitest + V8 coverage defaults                                                             |
| `@saflib/vitest/import-graph-reporter.js` | [`importGraphReporters()`](../../vitest/import-graph-reporter.js) — opt-in [@saflib/imports](../../imports/docs/01-overview.md#vitest-reporter) reporter |
| `@saflib/vitest/local-storage-stub`       | [`installLocalStorageStub()`](./ref/functions/installLocalStorageStub.md) — in-memory `localStorage` for suites that touch browser storage APIs          |

## `defaultConfig` defaults

Applied via [`base-vitest.config.js`](../../vitest/base-vitest.config.js):

| Setting                | Value                                         | Why                                                                    |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| `environment`          | `node`                                        | Backend libs and route handlers                                        |
| `setupFiles`           | [`test-setup.ts`](../../vitest/test-setup.ts) | Global stubs (see below)                                               |
| `isolate`              | `true`                                        | Avoids cross-test pollution when suites use different `vi.mock` setups |
| `include`              | `**/*.test.ts`                                | Standard SAF test naming                                               |
| `env.TZ`               | `UTC`                                         | Stable date assertions                                                 |
| `env.NODE_ENV`         | `test`                                        | Consistent with production guards                                      |
| `coverage`             | v8, `text` + `html`                           | Standard reporters; excludes tests, `dist/`, migrations                |
| `resolve.alias.stream` | `node:stream`                                 | Prevents Vite resolving Node built-in `stream` as a relative path      |

**Test isolation** is on by default because mixed `vi.mock` setups often break when files load before mocks apply (especially with `--no-file-parallelism`, or in CI). For purely functional suites with no mocks or globals, you can set `test.isolate: false` in a package-local config merge.

## Global setup (`test-setup.ts`)

Every package using `defaultConfig` gets:

1. **`installLocalStorageStub()`** — silences Node 22+ experimental webstorage warnings when code reads `localStorage`.
2. **`addErrorCollector(() => {})`** from [`@saflib/node`](../../node/docs/01-overview.md) — suppresses expected error stacks from `defaultErrorReporter` / `queryWrapper` during tests. Suites that assert on logging can register their own collector afterward.

## Import graph reporter

When `IMPORT_GRAPH_REPORT=1`, `defaultConfig` adds the [@saflib/imports](../../imports/docs/01-overview.md#vitest-reporter) Vitest reporter. Use it to find tests with large static import graphs (slow **collect** times, accidental app pulls).

```bash
IMPORT_GRAPH_REPORT=1 npm run test
```

## CLI: `test-coverage`

[`test-coverage`](./cli/test-coverage.md) wraps `TZ=UTC vitest run --coverage` and, with `--capture-log`, tees stdout to `./coverage/coverage-log.txt` for CI artifacts where TTY output would otherwise be lost.

```bash
npm exec test-coverage -- --capture-log
```
