# Product layering: make SAF's package layers explicit and enforced

> **Living document.** Whoever works on this (human or agent) keeps the
> **Status** section and **Decisions log** current as work lands. If you pick
> this up cold, read Status first, then Design, then the next unchecked phase.

## Status

- **Phase:** 1 done; parts of 6 done early (see below); 2 not started. A refactor of one large SAF product prototyped most of this.
- **Last updated:** 2026-10-18
- **Next action:** Phase 2 (layer model). D1–D4 are settled; the `objects`/`test` kinds and the `missing-kind` check have landed, every base package declares a kind, and `product/workflows/base-boundaries.test.ts` keeps base free of violations.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | `saf-imports boundaries`: undeclared, relative-escape, cycle, forbidden + baseline | done |
| 2 | Layer model: kinds → layers, built-in default rules, feature/sibling detection | todo |
| 3 | HTTP app chrome in saflib; composition root mounts routers | todo |
| 4 | Domain/context rules; integration package shape | todo |
| 5 | Client side: `sdk-common` in the template; delete runtime binders | todo |
| 6 | Templates and workflows produce layered packages | in progress |
| 7 | Docs, then migrate products | todo |

## Context

SAF products are workspace monorepos of small packages (`db`, `spec`, `http`,
`sdk`, `spa`, `integration`, …), and offshoots (`base/__offshoot-name__/{db,http,sdk,spec,test}`)
add sibling feature stacks. Nothing says which packages may import which.

A large product showed what goes wrong as it grows and splits into offshoots.
When code moved out of its monolithic core `http` package, every coupling it had hidden
came back as a cycle, and each cycle was dodged instead of fixed:

- **Undeclared imports.** tsconfig project references are generated from `dependencies`,
  so declaring a real cycle breaks `tsc -b`. npm hoisting means leaving the
  dependency out still resolves. Example: an integration package → `service-common` → the same integration package.
- **Relative paths across packages.** Example: an offshoot `billing/http` → `../../../../service/http/...`.
- **Runtime injection.** `bind*Deps()` calls in four places, which throw "unbound" if import order is wrong.
- **Upward imports.** Integrations import HTTP/spec packages; e.g. an email OAuth integration → the OAuth `http` package.

The base template itself has the shape that causes this:

- **`base/service/http/http.ts` mounts offshoot routers.** The product's feature http package is also the composition root, so offshoots can never import shared HTTP code from it. *(Fixed 2026-10-18: `service/monolith/http.ts` mounts them.)*
- **`base/service/common` depends on integration packages.** Its context types the integration clients, and `dependencies.ts` constructs them. So `service-common` is both the lowest shared library and the dependency-wiring layer.
- **Offshoot SDKs can't import the shared client.** It lives in the product's core `sdk`, and that package re-exports the offshoot SDKs, so a static import would form a cycle.

## Design

### Layers

Each layer may import only layers below it. Test files may import anything except the composition layer, and those imports are declared in `devDependencies`.

| # | Layer | `saf.kind` | May import | Template package |
| - | ----- | ---------- | ---------- | ---------------- |
| 1 | Composition | `app` | anything | `service/monolith` |
| 2 | App chrome | `http-app` | shared http, saflib | `service/http-app` (new) |
| 3 | Feature HTTP | `http` | 4–8 | `service/http`, `<offshoot>/http` |
| 4 | Shared HTTP | `http-common` | 5–8 | `service/common/http/*` (or its own package) |
| 5 | Domain | `domain` (today `lib`) | 6–8 | `service/common`, `service/audit`, integration `state/` |
| 6 | Integrations | `integration` | 7 (db + objects only, from `state/`) | `service/integrations/*` |
| 7 | Data & objects | `db`, `objects` | 8, other objects | `service/db`, `<offshoot>/db`, `<feature>/common` |
| 8 | Contracts | `spec` | other specs (see decision D2) | `service/spec`, `<offshoot>/spec`, `spec-common` |

Client side, the same idea:

| Layer | `saf.kind` | May import |
| ----- | ---------- | ---------- |
| SPA | `spa` | everything below |
| Vue components | `vue` | sdk, sdk-common, spec |
| Feature SDK | `sdk` | sdk-common, spec |
| SDK common | `sdk-common` | spec |

`test` packages (`service/test`, `<offshoot>/test`) are dev-only: importing them from a runtime file is a violation.

**Siblings.** Packages in the same layer that belong to different features never
import each other at runtime. A feature is a package's parent directory (an
offshoot stack, or the product's `service/`), overridable with `saf.feature`.
When two siblings need the same thing, it moves down a layer, never sideways,
and is never injected at runtime.

**Within an integration package**:

- `client.ts`, `calls/` and `bin/` talk to the external API only. They never import `state/` or db.
- `state/` reads and writes product tables.
- The package owns `configure*` / `get*Client` and test mocks.
- The service context does not carry integration clients.

**Domain context.** The service context holds infrastructure handles only: db keys and object stores.
It never constructs clients or wires dependencies; the composition root does that.

### Tooling

`saf-imports boundaries` (Phase 1) computes the violations; the layer model
(Phase 2) supplies default rules so a product needs no config to get them:

- **Rule source:** rules derive from `saf.kind`, which becomes required for every workspace package. Today layout tooling infers it, and few packages set it.
- **Product config:** a product adds only exceptions, plus its baseline file, under root `safImports.boundaries`.
- **Baseline:** CI fails on new violations and on stale baseline entries, so debt only shrinks.

## Phases

### Phase 1 — `saf-imports boundaries` (done)

- [x] Detects violation kinds:
  - undeclared workspace imports (runtime → `dependencies`; test → deps or devDeps);
  - relative imports, `$ref`s and `package.json` `imports` maps escaping their package;
  - TypeScript packages without a `tsconfig.json`;
  - package-level runtime cycles, reported as strongly connected components;
  - configured forbidden rules, optionally limited to subpaths of a package.
- [x] Baseline read/write/compare; `--update-baseline`; a shrunken cycle counts as progress.
- [x] Unit tests on temporary fixture monorepos.
- [x] Running in a product's Typecheck workflow.
- [x] Documented in `saflib/imports/docs/01-overview.md` ("Package boundaries").

### Phase 2 — Layer model

- [ ] Add the kinds `app`, `http-app`, `http-common`, `domain`, `objects`, `sdk-common` and `vue` to `@saflib/monorepo`'s kind list, and validate that every package declares a kind.
- [ ] Built-in default rules generated from the layer table: layer order, sibling rule, `test` kind dev-only, integration internals rule. `safImports.boundaries.layers: false` opts out.
- [ ] Feature detection (parent dir, `saf.feature` override); unit tests.
- [ ] Violation messages name the layer rule and suggest the move ("shared by billing/http and service/http → move to http-common").
- [ ] Run on every product, and write baselines. The size of each baseline is the migration backlog.

### Phase 3 — HTTP app chrome and composition

- [ ] Generalize the product-level HTTP app builder (mounts, security resolvers, public-route gate, error handling, SSE origins) into `@saflib/express` as `createProductHttpApp({ mounts, securityResolvers, isPublicRoute, … })`. The product's `http-app` package is a thin config wrapper.
- [ ] Route-test harness (`acquireSlimRouteTest`-style) in `@saflib/express/test`. Mounts only the routers a test passes, so a feature http package tests itself without the whole product.
- [ ] Composition root (`service/monolith`) owns:
  - the production mount list, public-route list and startup tasks;
  - the merged spec for jobs/cron (multi-spec `runJobs`);
  - the all-specs security test.
- [ ] Feature http packages export `create<Feature>Router()` only.

### Phase 4 — Domain and integrations

- [ ] Template `service/common`:
  - context = infrastructure handles only;
  - move `dependencies.ts` / `dependencies.integrations*.ts` to `service/monolith`;
  - remove its integration dependencies.
- [ ] Integration template (`integrations-workflows` init): `client.ts`, `calls/`, `bin/`, `mocks.ts`, `state/` (exported as `./state/*`), `configure*`/`get*Client` with a test seam.
- [ ] Shared HTTP: template `service/common/http/*` with `registerRoute` and the tenant/org context, plus a convention that any API mapper used by two feature packages lives there.

### Phase 5 — Client side

- [ ] Template `service/sdk-common`:
  - the API client factory and tenant header;
  - shared query-key factories;
  - the cache constants and the vue-query `Register` declaration.
- [ ] Offshoot SDK template imports `sdk-common` statically; delete the bind pattern from `base/__offshoot-name__/sdk`.
- [ ] Product `sdk` re-exports `sdk-common` for SPA convenience. `sdk` never re-exports offshoot SDKs: SPAs depend on them directly.

### Phase 6 — Templates and workflows

- [x] `express/init` offshoot areas (`offshoot-router-imports` / `-mounts`) move from `service/http/http.ts` to the composition root (`service/monolith/http.ts`).
- [ ] `express/add-handler` stays within the feature package (`routers.ts`).
- [ ] The offshoot workflow creates `{db,spec,http,sdk,test}` with the right kinds and dependencies, and creates no edge to the core http or sdk package. Done for http (`express/init` weaves into the composition root) and spec (`openapi/init` no longer weaves offshoot paths into the core spec, per D2). Still open: `sdk/init` adds the offshoot SDK to the core `sdk` (Phase 5).
- [ ] Product init creates only the layers a one-feature product needs. `http-common`, `sdk-common` and `domain` are created on first offshoot or when the boundaries check first suggests one.
- [ ] Template CI runs `saf-imports boundaries`. Partly: `product/workflows/base-boundaries.test.ts` checks the base packages within saflib's suite; a generated product doesn't run it in CI yet.

### Phase 7 — Docs and migration

- [ ] `saflib/docs` architecture page with both layer tables and the "move it down, never sideways" rule. Link it from `best-practices.md` and the offshoot workflow docs.
- [ ] Products: add kinds and a baseline, then burn down.

## Decisions (settled 2026-10-18)

- **D1 — `http-common` packaging: its own package.** It's checkable by kind alone. Products with a `service/common/http/*` subpath migrate to it.
- **D2 — Offshoots using core objects:** offshoot `spec`/`db` packages may reference the core `spec`/`db`, never core `http`/`sdk`. The core never references an offshoot; a schema both need lives in the core (or in an objects package). One exception: the core db's schema index re-exports offshoot tables (`drizzle/init`'s `offshoot-schema-exports`), so the one shared SQLite database has one migration history.
- **D3 — Integration state:** an integration package may define and manage its own state (tables and queries in its `state/`). Domain code calls the integration, never the other way around.
- **D4 — `saf.kind`: required, as an error.** `saf-imports boundaries` reports `missing-kind` for any in-scope package without a known kind.

## Decisions log

- 2026-10-18 — Plan created from a large product's package-layering refactor, generalized to the base template. Phase 1 (`saf-imports boundaries`) landed alongside it.
- 2026-10-18 — D1–D4 settled (see Decisions). Added `objects` and `test` kinds to `@saflib/monorepo`, and `missing-kind` to `saf-imports boundaries`.
- 2026-10-18 — Base template brought in line: `saf.kind` on every base package, undeclared base dependencies declared, offshoot routers mounted from `service/monolith/http.ts` (with `express/init` retargeted), and `openapi/init` no longer weaves offshoot paths into the core spec (D2: the core never references an offshoot). Spec packages export `./json-spec` (generated `dist/json-spec.ts`), so bundles can omit components shared with packages they build on.
- 2026-10-18 — D2 clarified: offshoot tables share the core SQLite database, and the core db schema index re-exporting them for migrations is the one allowed core → offshoot reference.
