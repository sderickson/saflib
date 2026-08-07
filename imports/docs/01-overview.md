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
