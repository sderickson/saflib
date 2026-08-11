# TypeScript project references

M1 wires **composite** TypeScript projects across the monorepo so `vue-tsc -b` / `tsc -b`
incrementally typecheck only what changed.

## Developer loop

From the **monorepo root**:

```bash
# Full incremental solution (preferred gate)
npm run typecheck

# After changing workspace deps or adding packages — regenerate references
npm run tsconfig:sync
# or: npm exec saf-imports tsconfig generate --write

# Verify references match the workspace graph (same check CI runs)
node --experimental-strip-types saflib/imports/bin/saf-imports/index.ts tsconfig check
```

Root `npm install` also runs `postinstall`, which syncs references when workspace
dependencies change (skipped in CI, `npm ci --omit=dev`, and when source is not
yet present e.g. Docker layer installs). Use `SAF_SKIP_TS_CONFIG_SYNC=1` to
disable for a single install.

From a **single package** (fast inner loop):

```bash
cd service/http
npm run typecheck        # 1st run — builds this package + upstream refs
npm run typecheck        # 2nd run — warm incremental (target ≤ 15s)
```

Vue SPAs use `vue-tsc -b` at the package root; backend packages use `tsc -b`.

## How references are generated

`saf-imports tsconfig generate --write` patches each package's `tsconfig.json`
`references` array from workspace `dependencies` (not `devDependencies` — test
tooling is omitted so production Docker builds and Vite bundles stay valid). It
also maintains:

- **Product root** `tsconfig.json` — `{ "path": "./saflib" }` hub + product leaves
- **saflib root** `tsconfig.json` — all saflib leaf packages (submodule standalone CI)
- **Composition root** — packages with `safImports.compositionRoot` in `package.json`
  union additional sibling or subtree references (e.g. a monolith entrypoint)

Rules:

- External references always point at a package's root `tsconfig.json`, never `tsconfig.app.json`.
- Declaration emit goes to `dist/types/` (gitignored); do not commit co-located `.d.ts` artifacts.
- Shared presets (`tsconfig.base.json`, `tsconfig.app.base.json`) must not contain package-specific `outDir` or `include` — those belong in each package's leaf config.

## Troubleshooting cycles

```bash
node --experimental-strip-types saflib/imports/bin/saf-imports/index.ts tsconfig cycles
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

## Type and import conventions

See [04-composite-type-guidance.md](./04-composite-type-guidance.md) for do's and don'ts
when authoring types, queries, and cross-package imports under composite project references.

## CI

Product and saflib typecheck workflows should run `saf-imports tsconfig check` before
`npm run typecheck`. Drift or cycles fail the job.

## Root driver

Product repos that mix Vue SPAs and backend packages often use **`vue-tsc -b`** at the root
so SFCs and services share one solution graph. Warm incremental root builds are typically
well under the 90s M1 target on a dev laptop after the initial cold build.
