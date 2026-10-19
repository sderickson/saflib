# Overview

SAF-specific import-graph measurement and enforcement tooling. Used across dev-tools (for CLI usage) and dev-site (for UI usage).

Syntactic file facts (exports, tests, Drizzle tables, Vue SFC surfaces) come from [@saflib/parser](../../parser/docs/01-overview.md) via `buildFileSpecialty()` in this package.

Use the saf-imports tool (described below) to find and debug import graph clusters.

## Import graph principles

- **No root barrels** — consumers import `@scope/pkg/subpath`, not package root. Avoid `export *` trees in `index.ts`.
- **Deep leaf imports** — import concrete modules (`@scope/my-db/queries/packet/create`), not group barrels, unless you explicitly want `…/group/index`.
- **Package-local `#` imports** — same-package code uses `#foo.ts` / `#lib/bar.ts`, not `../` climbs. Specifiers include the file extension.
- **`sideEffects: false`** — or explicit CSS/client entry exceptions for Vue and browser bundles.

Init workflows (`express/init`, `sdk/init`, `drizzle/init`, etc.) scaffold these defaults. Golden stubs live under `saflib/base/**` and workflow `template-package-*` trees.

## Package surface

npm `exports` / `imports` conventions and validation live in [@saflib/monorepo](../../monorepo/docs/01-overview.md#npm-package-surface). This package focuses on measuring whether static imports respect those boundaries.

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
npm exec saf-imports boundaries [--all] [--update-baseline]
```

For export coverage validation, use [saf-analyze-package](../../dev-tools/docs/package-issues.md).

`measure --verbose` lists every first-party file (repo-root-relative, sorted) and external package the entry statically imports.

## Package boundaries

`saf-imports boundaries` checks package-level import hygiene across the workspace:

- **undeclared** — a runtime file imports a workspace package that is not in `dependencies`, or a test/tooling file imports one that is in neither `dependencies` nor `devDependencies`. npm workspaces hoist every package, so these resolve anyway; they hide cycles from `tsconfig` project references.
- **relative-escape** — a relative import (or OpenAPI `$ref`) that resolves outside its own package. Import the package by name instead (`pkg:` for `$ref`).
- **cycle** — a cycle among runtime dependencies (declared `dependencies` plus actual runtime imports).
- **forbidden** — a dependency that a configured rule disallows.
- **missing-tsconfig** — a package with TypeScript sources but no `tsconfig.json`, so the root build never typechecks it.
- **missing-kind** — a package without a known `saf.kind` (see the layer table below, plus `lib` and `other`).
- **layer** — an import that breaks the product's layers (below).

### Layers

Every package declares a layer as its `saf.kind`. A package imports only the layers below it:

| `saf.kind`    | May import (from the same product)                              |
| ------------- | --------------------------------------------------------------- |
| `app`         | anything (the composition root, e.g. `service/monolith`)        |
| `http-app`    | `http-common`, `domain`, `integration`, `db`, `spec`, `objects` |
| `http`        | `http-common`, `domain`, `integration`, `db`, `spec`, `objects` |
| `http-common` | `domain`, `integration`, `db`, `spec`, `objects`                |
| `domain`      | `integration`, `db`, `objects`                                  |
| `integration` | `db`, `objects`                                                 |
| `db`          | `objects`                                                       |
| `spec`        | `objects`                                                       |
| `objects`     | other `objects` only                                            |
| `spa`         | `vue`, `sdk`, `sdk-common`, `spec`, `objects`                   |
| `vue`         | `sdk`, `sdk-common`, `spec`, `objects`                          |
| `sdk`         | `sdk-common`, `spec`, `objects`                                 |
| `sdk-common`  | `spec`, `objects`                                               |
| `test`        | anything, but only test files may import a `test` package       |

`lib` and `other` packages aren't layered yet: they're unchecked, and every layer except `objects` may import them. Reclassify them as products migrate.

Rules beyond the table (keys `layer(<rule>): from -> to`):

- **siblings** — packages of the same kind in different features don't import each other; what they share moves down a layer (e.g. two `http` packages → `http-common`). An offshoot may use the core's `domain`, `integration`, `db`, `spec` and `objects` packages, never the core's `http` or `sdk`. Any `objects` package may import any other.
- **core-offshoot** — the core never imports an offshoot, except from SPAs (which compose the client side and import offshoot SDKs directly), an offshoot's `objects` package and the core db's schema index (`schema`, `schemas/*`) re-exporting offshoot tables. Wire offshoots together in the `app` package.
- **test-dev-only** — a `test` package is never a runtime dependency.
- **integration-internals** — an integration package's client code (`client.ts`, `calls/`, `bin/`) imports neither a `db` package nor its own `state/`.

A **feature** is the first directory under the product root, the nearest ancestor that contains a `service/` directory: `service/*`, `clients/*` and packages directly in the product root make up the core (one feature), and `<offshoot>/*` is an offshoot. Set `saf.feature` in `package.json` to override. Imports of packages outside the product (e.g. `@saflib/*`) aren't layered. Turn the layer rules off with `"layers": false` under `safImports.boundaries`.

Test and tooling files (`*.test.ts`, `*.fake(s).ts`, `*mocks.ts`, `test/`, `bin/`, `scripts/`, `*.config.*`, …) may use `devDependencies` and are left out of the runtime graph.

Configure it in the repo-root `package.json`:

```json
"safImports": {
  "boundaries": {
    "baseline": "myproduct/import-boundaries.baseline.json",
    "scope": ["dir:myproduct/**"],
    "rules": [
      {
        "name": "integrations-no-api",
        "from": ["dir:myproduct/service/integrations/*"],
        "disallow": ["@myproduct/*-spec", "@myproduct/*-http"]
      }
    ]
  }
}
```

Selectors are package-name globs, `dir:<repo-relative glob>`, or `kind:<saf.kind>`. `scope` limits which packages are checked; everything is still a valid import target. Rules apply to runtime files unless `includeDev: true`.

The baseline lists accepted violation keys. The check fails on violations missing from the baseline **and** on baseline entries that no longer occur, so the baseline only shrinks. After fixing violations, run `saf-imports boundaries --update-baseline`.

## Vitest reporter

Tests are an indicator of import graph issues; unit tests that pull in a great deal of the application point to hotspots.

To help with this, you can run a Vitest reporter that reports the number of imports each test has. Opt-in via `IMPORT_GRAPH_REPORT=1` (wired in [`@saflib/vitest`](../../vitest/docs/01-overview.md#import-graph-reporter) `defaultConfig`). Prints one line per test file, then a run summary and those tests with the most imports:

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
