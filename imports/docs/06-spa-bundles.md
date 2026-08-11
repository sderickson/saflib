# SPA bundle measurement

M8 introduced static bundle budgets for gate SPAs: **app**, **admin**, **account**, **auth**.

## Shell vs page chunks

| Metric | What it includes |
| --- | --- |
| **Shell** | SPA entry + all `*Async.vue` + `*.loader.ts` chunks (by design — loaders live in shell) |
| **Page chunks** | Lazy `.vue` page files per route key from router analysis |

Shell gzip JS is a primary budget target when comparing local snapshots. Per-route page chunk
regressions are warn-only in snapshot check until nested-route `pageVueFiles` includes full ancestor
chains (e.g. review tab + parent `Detail.vue`).

## Commands

```bash
# Parse router without building
npm exec saf-imports spa analyze --spa app

# Measure from vite manifest (requires client build)
npm exec saf-imports spa measure --spa app
npm exec saf-imports spa measure-all
```

Build prerequisites (configure in root `package.json` → `safImports`):

- `devEnvFile` — local env file for client builds (e.g. `myproduct/dev/env.dev`)
- `snapshot.bundles.buildWorkspace` — client build package with `build.manifest: true`

## Local snapshot bundles

Store bundle metrics in a local snapshot (`safImports.snapshot` in root `package.json`):

```bash
npm exec saf-imports snapshot generate --out notes/import-graph/snapshot.json
npm exec saf-imports snapshot check --against notes/import-graph/snapshot.json
```

Or measure ad hoc:

```bash
npm exec saf-imports spa measure --spa app
```

Configured in root `package.json` → `safImports.snapshot.bundles` (SPA list, gzip thresholds).

## `sideEffects`

Client packages declare CSS/font side effects so Vite can tree-shake JS. M8 rolled `sideEffects` across
workspace packages; scan with `npm exec saf-imports side-effects scan`.
