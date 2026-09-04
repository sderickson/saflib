# Overview

`@saflib/monorepo` provides npm workspace conventions, shared package scaffolding, and tooling for SAF monorepos. It focuses on **npm packages** — how workspaces are organized, how `package.json` surfaces are defined, and how new packages are added.

For **TypeScript** — composite project references, cross-package typing conventions, and static import-graph analysis — see [@saflib/imports](../imports/docs/01-overview.md).

## What this package provides

- Shared presets each workspace package extends: [`tsconfig.json`](./ref/index.md), [`eslint.config.js`](./ref/index.md)
- Workflows: [add-package](./workflows/add-package.md), [add-export](./workflows/add-export.md)
- CLIs: [saf-format](./cli/saf-format.md), [saf-lock-prune](./cli/saf-lock-prune.md), [saf-ts-run](./cli/saf-ts-run.md)
- Layout and inventory APIs: package kind classification, `exports`/`imports` helpers, root-file allowlists, workspace context ([code reference](./ref/index.md))
- [`ReturnsError`](./ref/index/type-aliases/ReturnsError.md) — typed `{ result | error }` returns for async package functions

Init workflows (`express/init`, `sdk/init`, `drizzle/init`, etc.) and [monorepo/add-package](./workflows/add-package.md) scaffold packages with these defaults. Golden stubs live under [`saflib/base`](../base/docs/overview.md) and workflow template trees.

## Product layout

See [base](../base/docs/overview.md). A SAF **product** is a tree of npm workspace packages. In a multi-product repo each product lives under `{product}/`; a single-product repo may place `clients/`, `service/`, and `dev/` at the repo root instead.

Typical top-level layout:

```
{repo}/
├── {product}/
│   ├── clients/          # Vue SPAs, shared client code, links
│   ├── dev/              # docker compose for local development
│   ├── notes/            # specs and planning docs
│   ├── service/          # backend packages (see below)
│   └── {offshoot}/       # optional bounded feature slice (db, http, spec, sdk, test)
├── deploy/               # production images and deploy scripts
├── saflib/               # SAF platform submodule
├── package.json
└── package-lock.json
```

Use [product/init](../product/docs/workflows/init.md) to copy `saflib/base` into a new product. Workflows extend `saflib/base` in place so platform and product stay aligned.

### `clients/`

Web clients only (Vue SPAs today). Each SPA is its own workspace package named after its subdomain (`app/`, `auth/`, …), built together from a `build/` package. Shared client logic lives in `common/`; cross-SPA link objects live in `links/` so server code does not depend on Vue. See [@saflib/vue](../vue/docs/01-overview.md).

### `service/`

Backend packages for one product. Terminology:

- **Library** — shared logic, no long-running process
- **Server** — listens on a port (HTTP, gRPC, …)
- **Worker** — long-running work without a public port (cron, jobs runtime)
- **Service** — a coordinated set of servers and workers (e.g. identity)
- **Monolith** — runs the product's servers and workers together

| Package        | Role                                              | Kind        |
| -------------- | ------------------------------------------------- | ----------- |
| `common`       | shared service wiring (loggers, context, deps)    | library     |
| `spec`         | OpenAPI contract                                  | library     |
| `db`           | drizzle schema and queries                        | library     |
| `http`         | Express server and route handlers                 | server      |
| `sdk`          | TanStack Query clients tied to the API contract   | library     |
| `cron`         | scheduled job enqueuer                            | worker      |
| `jobs`         | async job runtime and trigger map                 | worker      |
| `integrations/`| third-party API wrappers (see below)              | integration |
| `monolith`     | boots http, cron, jobs, and related runtimes      | monolith    |
| `test`         | shared test factories for spec models             | test        |

**Dependency flow:** `spec` and `db` are independent layers. `http` depends on both and translates between wire and storage models. `sdk` depends on `spec` so clients stay decoupled from storage. `monolith` composes the runnable backends. All `clients/*` packages depend on `sdk` for API access.

**Offshoots** — `{product}/{offshoot}/` holds a vertical slice (`db`, `http`, `spec`, `sdk`, `test`) when a feature is large enough to warrant its own OpenAPI surface and packages but still mounts into the parent product's HTTP app. See [@saflib/openapi](../openapi/docs/01-overview.md#package-structure).

**Integrations** — `{product}/service/integrations/{vendor}/` wraps a third-party SDK behind mockable **calls** (e.g. `stripe`, `sendgrid`). See [@saflib/integrations](../integrations/docs/01-overview.md).

### `dev/` and `deploy/`

`dev/` runs the product locally (Caddy, Vite clients, monolith, Azurite, Kratos, …). `deploy/` holds production Docker and deploy scripts when products share one infrastructure.

## Package naming

Packages under `{product}/service/{name}/` import as `@{org}/{product}-{name}`:

- `acme/service/db/` → `@acme/acme-db`
- `acme/service/http/` → `@acme/acme-http`

Offshoot packages add the offshoot name: `acme/dossier/spec/` → `@acme/acme-dossier-spec`.

Client packages follow the same pattern: `acme/clients/app/` → `@acme/acme-app`.

## npm package surface

Each workspace package exposes an **explicit** public surface in `package.json`:

- **`exports`** — subpath map consumers import (`@scope/pkg/handlers/foo`, not package root). Use single-star folder globs (`./handlers/*` → `./handlers/*.ts`) plus explicit entries for allowlisted root files. No package-root catch-all.
- **`imports`** — package-local `#` specifiers mirroring the same folders (`#handlers/*`, `#errors.ts`). Same-package code uses `#…` with file extensions, not `../` climbs into sibling folders.
- **`saf.kind`** — declares package role (`db`, `http`, `spec`, `spa`, `sdk`, `lib`, `integration`, `test`, …). Layout tooling infers kind from identifier deps when omitted.
- **`sideEffects`** — `false` unless the package has explicit browser/CSS entry exceptions.

[monorepo/add-export](./workflows/add-export.md) adds a module and updates `exports`/`imports`. Run `npm exec saf-imports exports check --package <name>` to validate coverage (see [@saflib/imports CLI](../imports/docs/cli/saf-imports.md)).

**Layout rules:** production `.ts`/`.tsx` files belong in thematic folders, not loose at the package root, except for allowlisted entrypoints (`index.ts`, `main.ts`, `run.ts`, config files, …). `@saflib/dev-tools` [`saf-analyze-package`](../dev-tools/docs/package-issues.md) reports layout, dead-code, and oversized-file issues.

## TypeScript in SAF monorepos

TypeScript project references, composite builds, and import-graph tooling live in `@saflib/imports`:

- [Project references](../imports/docs/02-project-references.md) — `composite: true`, `dist/types/`, `saf-imports tsconfig sync|check`
- [Composite type guidance](../imports/docs/03-composite-type-guidance.md) — cross-package imports, Vue app/node split, query typing
- [saf-imports CLI](../imports/docs/cli/saf-imports.md) — `measure`, `why`, `cycles`, bundle snapshots, Vitest import-graph reporter

Each package still **extends** `@saflib/monorepo/tsconfig.json` (or `@saflib/vue` presets for SPAs) as part of npm scaffolding; `@saflib/imports` owns the reference graph and enforcement.

## Deployment models

Products can run standalone or as a shared **hub** (one domain, one identity, one monolith). Both are supported.

| Aspect           | Standalone product             | Product hub                          |
| ---------------- | ------------------------------ | ------------------------------------ |
| Domain           | One per product                | One for all (subdomains per product) |
| Identity         | Per-product                    | Single (hub)                         |
| Auth UI          | Per-product auth subdomain     | Single `auth.{domain}`               |
| Deploy monoliths | One container per product      | One container (hub monolith)         |
| Link subdomains  | Product-specific (`app`, …)    | Product-prefixed (`app.recipes`, …)  |

Use hub dev/deploy for a single login and deployment unit; keep per-product `dev/` for focused standalone development.

## The `saflib/` submodule

[The SAF source](https://github.com/sderickson/saflib) lives in a git submodule so products can reference, edit, and typecheck it directly. Changes under `saflib/` are tracked in the submodule; the parent repo records only the checked-out commit.

## Testing and typecheck

Run tests from the package directory:

```bash
cd {product}/service/http && npm run test
cd {product}/service/http && npx vitest run -- routes/scans/execute
```

Run `npm run typecheck` from the repo root for incremental solution builds. After adding packages or changing workspace deps, run `npm run tsconfig:sync` and `npm exec saf-imports tsconfig check`.

Package-specific testing guidance lives in the relevant `saflib/` package docs (e.g. [@saflib/drizzle testing](../drizzle/docs/04-testing.md)).
