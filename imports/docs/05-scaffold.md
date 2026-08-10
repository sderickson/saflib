# Scaffold defaults (import graph)

Init workflows (`sdk/init`, `express/init`, `service/init`, `drizzle/init`, etc.) should emit packages
with correct `exports` and `sideEffects` without manual follow-up.

## `package.json` fields

| Field | Default | Notes |
| --- | --- | --- |
| `sideEffects` | `false` | Vue/client: `["**/*.css", "**/*.scss"]` + entry files with side effects (`client.ts`) |
| `exports` | **Hybrid patterns** | Wildcards + explicit exceptions — not per-file leaf maps |
| `exportsAliases` | optional | Short paths, legacy names, `lib.ts` barrels |

## Export pattern examples

| Package kind | Pattern shape |
| --- | --- |
| SDK / HTTP requests | `./requests/*` → `index.ts`; `./requests/*/*` → ops/fakes |
| DB queries | `./queries/*` → `index.ts`; `./queries/*/*` → leaf handlers |
| DB schemas | `./schemas/*` → `*.ts` |
| Service common | `./*` root files; `./lib/*`, `./dossiers/*` |
| Vue clients-common | `./components/*` barrels; `./components/*/*` logic; explicit `.vue` entry points |

Reference implementations:

- `@pathclerk/daemon-spec` — `./operations/*`, `./schemas/*`
- `@pathclerk/daemon-sdk`, `@pathclerk/daemon-db`, `@pathclerk/daemon-service-common`,
  `@pathclerk/daemon-forms`, `@pathclerk/daemon-clients-common`

Validate with:

```bash
npm exec saf-imports exports check --package <name>
```

## Principles

- **No root barrels** — no `export *` from package `index.ts` that re-exports the whole tree.
- **Deep imports** — consumers import `@scope/pkg/subpath`, not package root.
- **Slim test harnesses** — route tests use `slim-route-test`; component tests use scoped MSW, not full app boot.

## `saf-imports exports`

- `exports generate --package <name>` — writes a **leaf** map (refuses WORKFLOW AREA packages).
- `exports check --package <name>` — leaf diff, or **pattern coverage** when `*` keys are present.

For large packages, prefer hand-authored patterns over `exports generate`.

## `vue/add-view`

New routes are picked up by `saf-imports spa analyze --spa <name>` automatically. Refresh bundle baseline only
when a new route adds a materially heavy page chunk (not every add-view).
