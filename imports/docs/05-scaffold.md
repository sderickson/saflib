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

Node subpath exports allow **only one `*` per pattern key** (and per target). Patterns like
`./queries/*/*` are not valid for native `import` / `require` resolution — use explicit leaf
exports for nested files instead.

| Package kind | Pattern shape |
| --- | --- |
| SDK / HTTP requests | `./requests/*` → group `index.ts`; leaf ops added explicitly (workflows run `exports generate`) |
| DB queries | `./queries/*` → group `index.ts`; leaf handlers explicit |
| DB schemas | `./schemas/*` → `*.ts` (one segment) |
| Service common | `./*` root files; `./lib/*` single-segment wildcards |
| Vue clients-common | `./components/*` barrels; nested `.logic.ts` via explicit exports |

Reference implementations (workflow templates):

- `template-package-spec` — `./operations/*`, `./schemas/*`
- `template-package-sdk`, `template-package-db`, `template-package-service-common`,
  `template-package-forms`, `template-package-clients-common`

Validate with:

```bash
npm exec saf-imports exports check --package <name>
```

`exports check` fails on export keys with more than one `*`.

## Principles

- **No root barrels** — no `export *` from package `index.ts` that re-exports the whole tree.
- **Deep imports** — consumers import `@scope/pkg/subpath`, not package root.
- **Slim test harnesses** — route tests use `slim-route-test`; component tests use scoped MSW, not full app boot.

## `saf-imports exports`

- `exports generate --package <name>` — writes a **leaf** map (refuses WORKFLOW AREA packages).
- `exports check --package <name>` — leaf diff, or **pattern coverage** when `*` keys are present.

For large packages, prefer hand-authored single-`*` patterns plus explicit nested exports over
`exports generate` on every file — or run `exports generate` after adding routes/queries to refresh
the leaf map.

## `vue/add-view`

New routes are picked up by `saf-imports spa analyze --spa <name>` automatically. Refresh bundle baseline only
when a new route adds a materially heavy page chunk (not every add-view).
