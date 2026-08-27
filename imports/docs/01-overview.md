# @saflib/imports

SAF-specific import-graph measurement and enforcement tooling.

## Documentation

| Doc | Topic |
| --- | --- |
| [01-overview.md](./01-overview.md) | This page — CLI summary, snapshot tool |
| [02-ci.md](./02-ci.md) | ESLint import-graph rules, PR checklist |
| [03-project-references.md](./03-project-references.md) | TypeScript project references (`saf-imports tsconfig`, `src/tsconfig/`) |
| [04-composite-type-guidance.md](./04-composite-type-guidance.md) | Types across composite packages |
| [05-scaffold.md](./05-scaffold.md) | Init workflow defaults (`sideEffects`, exports, `#` imports) |
| [06-spa-bundles.md](./06-spa-bundles.md) | SPA shell vs page chunk measurement |
| [cli/](./cli/index.md) | Generated CLI reference |

## Principles (summary)

- **No root barrels** — import `@scope/pkg/subpath`, not deleted package roots.
- **Hybrid `exports`** — wildcard patterns + `exportsAliases` for large packages (see [05-scaffold.md](./05-scaffold.md)).
- **Package-local `#` imports** — same-package code uses `#foo.ts` / `#lib/bar.ts`, not `../` climbs.
- **`sideEffects: false`** (or explicit CSS/client entry exceptions) for tree-shaking.
- **Snapshot tool** — optional local metrics snapshots for test graphs and entry probes (not gated in CI today).

## CLI

```bash
npm exec saf-imports -- measure <entry...>
npm exec saf-imports -- measure --verbose path/to/my.test.ts
npm exec saf-imports -- why <entry> <target>
npm exec saf-imports cycles [--package <name>]
npm exec saf-imports exports generate --package <name>
npm exec saf-imports exports check --package <name>
npm exec saf-imports snapshot generate --out <path> [--skip-timings]
npm exec saf-imports snapshot check --against <path>
npm exec saf-imports spa analyze --spa <app|admin|account|auth>
npm exec saf-imports spa measure --spa <name>
npm exec saf-imports side-effects scan [--package <name>]
npm exec saf-imports tsconfig cycles|generate|check [--root <dir>]
```

`measure --verbose` lists every first-party file (repo-root-relative, sorted) and external
package the entry statically imports:

```bash
npm exec saf-imports -- measure --verbose myproduct/service/http/routes/audit-logs/seal.test.ts
```

See [03-project-references.md](./03-project-references.md) for the dev loop and troubleshooting, and [04-composite-type-guidance.md](./04-composite-type-guidance.md) for do's and don'ts when writing types across composite packages.


## Vitest reporter (opt-in)

Prints one line per test file after it finishes, then a run summary:

```
import-graph  routes/matters/list-importers.test.ts  modules=1071  ext=56  collect=4.98s

import-graph summary (162 test files)
  collect: min=0.04s  mean=1.23s  median=0.89s  max=4.98s  (n=162)
  slowest collect:
    1. routes/matters/list-importers.test.ts  collect=4.98s  modules=1071  ext=56
    …
  largest graphs:
    1. …
```

### Any package using `@saflib/vitest`

`defaultConfig` in `@saflib/vitest` wires the reporter when `IMPORT_GRAPH_REPORT=1`. No per-package
`vitest.config.js` changes needed unless you override `reporters` entirely.

### Root shortcut

```bash
npm run import-graph:report -- @myorg/myproduct-http
npm run import-graph:report -- myproduct-http -- routes/matters/list-importers
```

The script sets `IMPORT_GRAPH_REPORT=1` and runs `npm run test -w <workspace>` with optional Vitest
pattern args after `--`.

### Manual enable

```bash
IMPORT_GRAPH_REPORT=1 npm run test -w @myorg/myproduct-http
```

### Packages with custom `reporters`

If a workspace overrides `test.reporters` in its own `vitest.config.js`, merge with
`importGraphReporters()` from `@saflib/vitest/import-graph-reporter.js`:

```js
import { importGraphReporters } from "@saflib/vitest/import-graph-reporter.js";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    test: {
      reporters: importGraphReporters(),
    },
  }),
);
```

## Reporter overhead (2026-08-07 pilot)

Measured on a large HTTP service test suite (162 files), same machine:

| Config                                  | Wall (real) | Vitest Duration |
| --------------------------------------- | ----------: | --------------: |
| Without reporter (`--reporter=default`) |      17.40s |          16.70s |
| With `@saflib/imports/reporter`         |      ~29.4s |          ~28.7s |

Overhead ≈ **+70%** wall time — keep opt-in only (`IMPORT_GRAPH_REPORT=1` or `import-graph:report`).

## Metrics snapshots

Configure entry probes, suite timings, and bundle targets via root
`package.json` → `safImports.snapshot` (see `@saflib/imports` source for the schema).

```bash
npm exec saf-imports snapshot generate --out notes/import-graph/snapshot.json --skip-timings
npm exec saf-imports snapshot check --against notes/import-graph/snapshot.json
```

Snapshots are a local/reporting tool for now — not wired into CI.
