# TypeScript project references

M1 wires **composite** TypeScript projects across the monorepo so `vue-tsc -b` / `tsc -b`
incrementally typecheck only what changed.

## Developer loop

From the **pathclerk repo root**:

```bash
# Full incremental solution (preferred gate)
npm run typecheck

# After changing workspace deps or adding packages — regenerate references
node --experimental-strip-types saflib/imports/bin/saf-imports/index.ts references generate --write

# Verify references match the workspace graph (same check CI runs)
node --experimental-strip-types saflib/imports/bin/saf-imports/index.ts references check
```

From a **single package** (fast inner loop):

```bash
cd daemon/service/http
npm run typecheck        # 1st run — builds this package + upstream refs
npm run typecheck        # 2nd run — warm incremental (target ≤ 15s)
```

Vue SPAs use `vue-tsc -b` at the package root; backend packages use `tsc -b`.

## How references are generated

`saf-imports references generate --write` patches each package's `tsconfig.json`
`references` array from workspace `dependencies` ∪ `devDependencies`. It also
maintains:

- **pathclerk root** `tsconfig.json` — `{ "path": "./saflib" }` hub + daemon/deploy leaves
- **saflib root** `tsconfig.json` — all saflib leaf packages (submodule standalone CI)
- **Monolith rule** — `@pathclerk/daemon-monolith` references every `daemon/service/*` package

Rules:

- External references always point at a package's root `tsconfig.json`, never `tsconfig.app.json`.
- Declaration emit goes to `dist/types/` (gitignored); do not commit co-located `.d.ts` artifacts.
- Shared presets (`tsconfig.base.json`, `tsconfig.app.base.json`) must not contain package-specific `outDir` or `include` — those belong in each package's leaf config.

## Troubleshooting cycles

```bash
node --experimental-strip-types saflib/imports/bin/saf-imports/index.ts references cycles
```

Package-level cycles block `composite` builds. **Fix the dependency graph** — merge packages,
extract shared types to a third package, or remove a spurious workspace dep. Do not omit
reference edges to hide cycles.

## Stale incremental builds

If you delete `dist/types/` or see mass `TS6305` ("output not built") errors after a clean:

```bash
find . -path '*/node_modules/.tmp/*.tsbuildinfo' -delete
npm run typecheck -- --force   # or: npx vue-tsc -b --force
```

Deleting `dist/types` without clearing `.tsbuildinfo` can make TypeScript think projects are
up to date when declarations are missing.

## CI

Both pathclerk and saflib typecheck workflows run `saf-imports references check` before
`npm run typecheck`. Drift or cycles fail the job.

## Root driver

The pathclerk root uses **`vue-tsc -b`** so Vue SFCs and backend packages share one solution
graph. Warm incremental root builds are typically well under the 90s M1 target on a dev laptop
after the initial cold build.
