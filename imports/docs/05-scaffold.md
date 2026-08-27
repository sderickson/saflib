# Scaffold defaults (import graph)

Init workflows (`sdk/init`, `express/init`, `service/init`, `drizzle/init`, etc.) should emit packages
with correct `exports`, `imports`, and `sideEffects` without manual follow-up.

## `package.json` fields

| Field | Default | Notes |
| --- | --- | --- |
| `sideEffects` | `false` | Vue/client: `["**/*.css", "**/*.scss"]` + entry files with side effects (`client.ts`) |
| `exports` | **Single-star globs** | `./dir/*` → `./dir/*.ts` — not per-file leaf maps |
| `imports` | **Package-local `#` maps** | Extension-preserving; see below |
| `exportsAliases` | optional | Short paths, legacy names, remaps (e.g. `lib.ts`) |

## Package-local `#` imports

Prefer Node `package.json` `"imports"` over `../` parent climbs **within the same package**.

- Specifiers **include the extension** (`#context.ts`, `#lib/fill-pdf-form.ts`) so `.json` / `.vue` work the same way.
- Do **not** auto-append `.ts` in the map (targets are `./*`, not `./*.ts`).
- Classic `#foo.ts` / `#lib/bar.ts` (not `#/…` — that needs newer TypeScript).

**Choose one shape** (do not mix a catch-all with redundant folder globs):

1. **Root catch-all** — only when `exports` has `./*` (service-common, SPA shells). Nested paths are covered; skip thematic `#dir/*` entries.

```json
"imports": {
  "#*": "./*"
}
```

2. **Explicit surface** — when there is no `./*` export. List thematic folders and root files so nested files can only `#`-import what you intend:

```json
"imports": {
  "#queries/*": "./queries/*",
  "#schemas/*": "./schemas/*",
  "#instances.ts": "./instances.ts",
  "#errors.ts": "./errors.ts",
  "#types.ts": "./types.ts",
  "#components": "./components/index.ts",
  "#components/*": "./components/*",
  "#i18n.ts": "./i18n.ts"
}
```

```ts
import { claimBacklogItems } from "#matter-pipeline/claim-backlog-items.ts";
import { fillPdfForm } from "#lib/fill-pdf-form.ts";
import { baseDbManager } from "#instances.ts";
```

Scaffold helpers (`prepareNewPackageExports`, `upsertPackageJsonExportsForModule`) keep `imports`
in sync with `exports` (template `__placeholders__` stripped on init). Hand-author extra keys for
internal-only paths that are not in `exports` (e.g. integration `#calls/*`, `#client.ts`).

## Export pattern examples

Node subpath exports allow **only one `*` per pattern key** (and per target). That `*` is
**string substitution** and may include `/` (nested paths). Do **not** use `./foo/*/*`.

| Package kind | Pattern shape |
| --- | --- |
| SDK requests | `./requests/*` → `./requests/*.ts` |
| DB queries | `./queries/*` → `./queries/*.ts` |
| DB schemas | `./schemas/*` → `./schemas/*.ts` |
| HTTP handlers | `./handlers/*` → `./handlers/*.ts` |
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
- Golden product stubs under `saflib/base/**` (including `imports`)

Validate with:

```bash
npm exec saf-imports exports check --package <name>
```

`exports check` fails on export keys with more than one `*`.

## Principles

- **No root barrels** — no `export *` from package `index.ts` that re-exports the whole tree.
- **Deep imports** — consumers import `@scope/pkg/subpath`, not package root.
- **Package-local `#` imports** — same-package code uses `#…`, not `../` climbs.
- **Explicit index** — import `…/group/index` when you want the group barrel (globs map to `*.ts`, not `*/index.ts`).
- **Slim test harnesses** — route tests use `slim-route-test`; component tests use scoped MSW, not full app boot.

## `saf-imports exports`

- `exports generate --package <name>` — writes a **leaf** map (refuses WORKFLOW AREA packages). Prefer hand-authored single-`*` patterns for large packages.
- `exports check --package <name>` — leaf diff, or **pattern coverage** when `*` keys are present.

## `vue/add-view`

New routes are picked up by `saf-imports spa analyze --spa <name>` automatically. Refresh bundle baseline only
when a new route adds a materially heavy page chunk (not every add-view).
