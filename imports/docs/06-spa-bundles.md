# SPA bundle measurement

M8 introduced static bundle budgets for gate SPAs: **app**, **admin**, **account**, **auth**.

## Shell vs page chunks

| Metric | What it includes |
| --- | --- |
| **Shell** | SPA entry + all `*Async.vue` + `*.loader.ts` chunks (by design — loaders live in shell) |
| **Page chunks** | Lazy `.vue` page files per route key from router analysis |

Shell gzip JS is the **M9 error** budget target. Per-route page chunk regressions are **warn-only** until
nested-route `pageVueFiles` includes full ancestor chains (e.g. review tab + parent `Detail.vue`).

## Commands

```bash
# Parse router without building
npm exec saf-imports spa analyze --spa app

# Measure from vite manifest (requires client build)
npm exec saf-imports spa measure --spa app
npm exec saf-imports spa measure-all
```

Build prerequisites:

- `daemon/dev/env.dev` present
- `npm run build` in `daemon/clients/build` (or workspace build) with `build.manifest: true`

## Baseline

Committed in `daemon/plans/notes/2026-08-07-test-import-graph/baseline.json` under `bundles`.

Refresh after intentional shell changes:

```bash
node saflib/imports/scripts/update-baseline-bundles.mjs
```

Configured in root `package.json` → `safImports.snapshot.bundles` (SPA list, gzip thresholds).

## `sideEffects`

Client packages declare CSS/font side effects so Vite can tree-shake JS. M8 rolled `sideEffects` across
workspace packages; scan with `npm exec saf-imports side-effects scan`.
