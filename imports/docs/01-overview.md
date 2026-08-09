# @saflib/imports

SAF-specific import-graph measurement and enforcement tooling.

## Documentation

| Doc | Topic |
| --- | --- |
| [01-overview.md](./01-overview.md) | This page — CLI summary, `importBudget`, baseline |
| [02-ci.md](./02-ci.md) | `import-graph:check`, fixing regressions, PR checklist |
| [03-project-references.md](./03-project-references.md) | TypeScript project references |
| [04-composite-type-guidance.md](./04-composite-type-guidance.md) | Types across composite packages |
| [05-scaffold.md](./05-scaffold.md) | Init workflow defaults (`sideEffects`, exports, budgets) |
| [06-spa-bundles.md](./06-spa-bundles.md) | SPA shell vs page chunk measurement |
| [cli/](./cli/index.md) | Generated CLI reference |

## Principles (summary)

- **No root barrels** — import `@scope/pkg/subpath`, not deleted package roots.
- **Hybrid `exports`** — wildcard patterns + `exportsAliases` for large packages (see [05-scaffold.md](./05-scaffold.md)).
- **`sideEffects: false`** (or explicit CSS/client entry exceptions) for tree-shaking.
- **`importBudget`** — per-package test-file graph limits; CI enforces via `saf-imports budget`.

## CLI

```bash
npm exec saf-imports measure <entry...>
npm exec saf-imports why <entry> <target>
npm exec saf-imports cycles [--package <name>]
npm exec saf-imports budget [--mode warn|error]
npm exec saf-imports exports generate --package <name>
npm exec saf-imports exports check --package <name>
npm exec saf-imports baseline generate --out <path> [--skip-timings]
npm exec saf-imports baseline diff --baseline <path>
npm exec saf-imports spa analyze --spa <app|admin|account|auth>
npm exec saf-imports spa measure --spa <name>
npm exec saf-imports side-effects scan [--package <name>]
npm exec saf-imports references cycles|generate|check [--root <dir>]
```

See [03-project-references.md](./03-project-references.md) for the dev loop and troubleshooting, and [04-composite-type-guidance.md](./04-composite-type-guidance.md) for do's and don'ts when writing types across composite packages.


## Vitest reporter (opt-in)

Prints one line per test file after it finishes:

```
import-graph  list-importers.test.ts  modules=1071  ext=56  collect=4.98s
```

Wire it in a package's `vitest.config.js` (opt-in per package — not in `@saflib/vitest`
base config until overhead stays ≤ 10%). Prefer the package-name form so Vitest loads
the TypeScript module via Vite (a static `import` of `@saflib/imports/reporter` from a
`.js` config fails under plain Node):

```js
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    test: {
      reporters: ["default", "@saflib/imports/reporter"],
    },
  }),
);
```

Add `@saflib/imports` as a devDependency of the package.

## Reporter overhead (2026-08-07 pilot)

Measured on a large HTTP service test suite (162 files), same machine:

| Config                                  | Wall (real) | Vitest Duration |
| --------------------------------------- | ----------: | --------------: |
| Without reporter (`--reporter=default`) |      17.40s |          16.70s |
| With `@saflib/imports/reporter`         |      ~29.4s |          ~28.7s |

Overhead ≈ **+70%** wall time — **above the 10% promotion threshold**. Keep
opt-in only; do **not** add to `base-vitest.config.js` until measuring is
cheap enough for default-on use.

## `importBudget`

Declare per-package limits in `package.json`:

```json
{
  "importBudget": {
    "testFiles": { "maxModules": 400, "maxExternalPackages": 30 },
    "entries": {
      "./lib/foo.ts": { "maxModules": 5 }
    }
  }
}
```

Run `npm exec saf-imports budget [--mode warn|error]` to compare against optional per-package
`importBudget` limits (skipped when unset). Report all package costs:

```bash
node saflib/imports/scripts/generate-import-budgets.mjs
```

## Baseline snapshots

Product repos can commit a baseline JSON and configure entry probes / suite timings via
root `package.json` → `safImports.baseline` (see `@saflib/imports` source for the schema).

```bash
npm exec saf-imports baseline generate --out notes/import-graph/baseline.json --skip-timings
npm exec saf-imports baseline diff --baseline notes/import-graph/baseline.json
```
