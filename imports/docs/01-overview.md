# Overview

SAF-specific import-graph measurement and enforcement tooling. Used across dev-tools (for CLI usage) and dev-site (for UI usage).

## SAF Import Graph Principles

- **No root barrels** — import `@scope/pkg/subpath`. This avoids needless coupling to and loading of logic, particularly in tests and builds.
- **Package-local `#` imports** — same-package code uses `#foo.ts` / `#lib/bar.ts`, not `../` climbs.
- **`sideEffects: false`** (or explicit CSS/client entry exceptions) for tree-shaking.
- **Snapshot tool** — optional local metrics snapshots for test graphs and entry probes.

## CLI

The saf-imports CLI program helps you analyze and debug issues in your import graph. This might show up for example in large "collect" times in tests which should run much faster in isolation.

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

## Vitest Reporter

Useful for debugging slow collection times in tests and where there might be high coupling in the application that needs to be addressed.Prints one line per test file after it finishes, then a run summary:

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

## Metrics snapshots

Configure entry probes, suite timings, and bundle targets via root
`package.json` → `safImports.snapshot` (see `@saflib/imports` source for the schema).

```bash
npm exec saf-imports snapshot generate --out notes/import-graph/snapshot.json --skip-timings
npm exec saf-imports snapshot check --against notes/import-graph/snapshot.json
```

Snapshots are a local/reporting tool for now — not wired into CI.
