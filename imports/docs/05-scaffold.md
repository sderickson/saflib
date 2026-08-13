# Scaffold defaults (import graph)

Init workflows (`sdk/init`, `express/init`, `service/init`, `drizzle/init`, etc.) should emit packages
with correct `exports` and `sideEffects` without manual follow-up.

## `package.json` fields

| Field | Default | Notes |
| --- | --- | --- |
| `sideEffects` | `false` | Vue/client: `["**/*.css", "**/*.scss"]` + entry files with side effects (`client.ts`) |
| `exports` | **Single-star globs** | `./dir/*` → `./dir/*.ts` — not per-file leaf maps |
| `exportsAliases` | optional | Short paths, legacy names, remaps (e.g. `lib.ts`) |

## Export pattern examples

Node subpath exports allow **only one `*` per pattern key** (and per target). That `*` is
**string substitution** and may include `/` (nested paths). Do **not** use `./foo/*/*`.

| Package kind | Pattern shape |
| --- | --- |
| SDK requests | `./requests/*` → `./requests/*.ts` |
| DB queries | `./queries/*` → `./queries/*.ts` |
| DB schemas | `./schemas/*` → `./schemas/*.ts` |
| HTTP routes | `./routes/*` → `./routes/*.ts` |
| Service common / forms | `./*` → `./*.ts` (plus aliases when useful) |
| Vue clients-common | `./components/*` → `./components/*.ts` |
| Spec operations | `./operations/*` → `./dist/operations/*/index.ts` |

Import leaf query functions **explicitly** (no group `index` barrels):

```ts
import { createPacket } from "@scope/my-db/queries/packet/create";
import { listEvalsQuery } from "@scope/my-sdk/requests/evals/list";
```

Adding a new query/handler/request file does **not** require editing `package.json` or running
`exports generate`.

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
- **Explicit index** — import `…/group/index` when you want the group barrel (globs map to `*.ts`, not `*/index.ts`).
- **Slim test harnesses** — route tests use `slim-route-test`; component tests use scoped MSW, not full app boot.

## `saf-imports exports`

- `exports generate --package <name>` — writes a **leaf** map (refuses WORKFLOW AREA packages). Prefer hand-authored single-`*` patterns for large packages.
- `exports check --package <name>` — leaf diff, or **pattern coverage** when `*` keys are present.

## `vue/add-view`

New routes are picked up by `saf-imports spa analyze --spa <name>` automatically. Refresh bundle baseline only
when a new route adds a materially heavy page chunk (not every add-view).
