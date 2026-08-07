# @saflib/imports

SAF-specific import-graph measurement and enforcement tooling.

## CLI

```bash
npm exec saf-imports measure <entry...>
npm exec saf-imports why <entry> <target>
npm exec saf-imports cycles [--package <name>]
npm exec saf-imports budget [--mode warn|error]
npm exec saf-imports exports generate --package <name>
npm exec saf-imports exports check --package <name>
```

## Vitest reporter (opt-in)

Prints one line per test file after it finishes:

```
import-graph  list-importers.test.ts  modules=1071  ext=56  collect=4.98s
```

Wire it in a package's `vitest.config.js` (pilot: `daemon/service/http` only —
not in `@saflib/vitest` base config until overhead stays ≤ 10%). Prefer the
package-name form so Vitest loads the TypeScript module via Vite (a static
`import` of `@saflib/imports/reporter` from a `.js` config fails under plain Node):

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

Measured on `daemon/service/http` full suite (162 files), same machine:

| Config                                  | Wall (real) | Vitest Duration |
| --------------------------------------- | ----------: | --------------: |
| Without reporter (`--reporter=default`) |      17.40s |          16.70s |
| With `@saflib/imports/reporter`         |      ~29.4s |          ~28.7s |

Overhead ≈ **+70%** wall time — **above the 10% promotion threshold**. Keep
opt-in only; do **not** add to `base-vitest.config.js` until measuring is
cheaper (e.g. shared package-index cache across files). Promotion to the
Vitest base config is deferred.

## `importBudget`

Optional field in a package's `package.json`. Packages without it are skipped by
`saf-imports budget`.

```json
{
  "importBudget": {
    "testFiles": {
      "maxModules": 400,
      "maxExternalPackages": 25
    },
    "entries": {
      "./index.ts": { "maxModules": 50 }
    }
  }
}
```

`testFiles` uses the **max** modules/ext across all `*.test.ts` files in the package.

## Exports codegen (M0)

`saf-imports exports generate|check` builds a heuristic `exports` map from
top-level and `src/` TypeScript files (`index.ts` → directory subpath).

**M0 limitation:** packages whose `package.json` contains `BEGIN WORKFLOW AREA`
markers are **not** supported by `generate` (refuses to write). Mass rollout and
WORKFLOW AREA merge land in later milestones. Pilot: `@saflib/imports` only.
