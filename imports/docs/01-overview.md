# Overview

SAF-specific import-graph measurement and enforcement tooling. Used across dev-tools (for CLI usage) and dev-site (for UI usage).

## Import graph principles

- **No root barrels** — consumers import `@scope/pkg/subpath`, not package root. Avoid `export *` trees in `index.ts`.
- **Deep leaf imports** — import concrete modules (`@scope/my-db/queries/packet/create`), not group barrels, unless you explicitly want `…/group/index`.
- **Package-local `#` imports** — same-package code uses `#foo.ts` / `#lib/bar.ts`, not `../` climbs. Specifiers include the file extension.
- **`sideEffects: false`** — or explicit CSS/client entry exceptions for Vue and browser bundles.

Init workflows (`express/init`, `sdk/init`, `drizzle/init`, etc.) scaffold these defaults. Golden stubs live under `saflib/base/**` and workflow `template-package-*` trees.

## Package surface

npm `exports` / `imports` conventions and validation live in [@saflib/monorepo](../monorepo/docs/01-overview.md#npm-package-surface). This package focuses on measuring whether static imports respect those boundaries.

See [project references](./02-project-references.md) for composite TypeScript setup and [composite type guidance](./03-composite-type-guidance.md) for cross-package typing conventions.

## CLI

The `saf-imports` CLI helps analyze and debug import-graph and TypeScript project-reference issues — for example slow Vitest **collect** times that suggest a test pulls in too much of the app.

```bash
npm exec saf-imports -- measure <entry...>
npm exec saf-imports -- measure --verbose path/to/my.test.ts
npm exec saf-imports -- why <entry> <target>
npm exec saf-imports cycles [--package <name>]
npm exec saf-imports snapshot generate --out <path> [--skip-timings]
npm exec saf-imports snapshot check --against <path>
npm exec saf-imports spa analyze --spa <app|admin|account|auth>
npm exec saf-imports spa measure --spa <name>
npm exec saf-imports tsconfig sync|check|cycles|cleanup-declarations [--root <dir>]
```

For `exports` and `side-effects` tooling, see [saf-monorepo](../monorepo/docs/cli/saf-monorepo.md).

`measure --verbose` lists every first-party file (repo-root-relative, sorted) and external package the entry statically imports.

## Vitest reporter

Tests are an indicator of import graph issues; unit tests that pull in a great deal of the application point to hotspots.

To help with this, you can run a Vitest reporter that reports the number of imports each test has. Opt-in via `IMPORT_GRAPH_REPORT=1` (wired in `@saflib/vitest` `defaultConfig`). Prints one line per test file, then a run summary and those tests with the most imports:

```
import-graph  routes/matters/list-importers.test.ts  modules=1071  ext=56  collect=4.98s

import-graph summary (162 test files)
  collect: min=0.04s  mean=1.23s  median=0.89s  max=4.98s  (n=162)
  …
```

## Metrics snapshots

A tool for measuring changes in the import graph, when doing targeted work on it or to (eventually) incorporate into tooling to flag major regressions.

Configure entry probes, suite timings, and bundle targets via root `package.json` → `safImports.snapshot` (see `@saflib/imports` source for the schema).

```bash
npm exec saf-imports snapshot generate --out notes/import-graph/snapshot.json --skip-timings
npm exec saf-imports snapshot check --against notes/import-graph/snapshot.json
```

Snapshots are a local reporting tool — not wired into CI.
