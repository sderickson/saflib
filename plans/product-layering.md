# Product layering: make SAF's package layers explicit and enforced

> **Living document.** Whoever works on this (human or agent) keeps the
> **Status** section and **Decisions log** current as work lands. If you pick
> this up cold, read Status first, then Design, then the next unchecked phase.

## Status

- **Phase:** 1 and 2 done; parts of 6 done early (see below). A refactor of one large SAF product prototyped most of this.
- **Last updated:** 2026-10-18
- **Next action:** Phase 3 (HTTP app chrome and composition), or burn down a product baseline. Previously: Phase 2 (layer model). D1–D4 are settled; the `objects`/`test` kinds and the `missing-kind` check have landed, every base package declares a kind, and `product/workflows/base-boundaries.test.ts` keeps base free of violations.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | `saf-imports boundaries`: undeclared, relative-escape, cycle, forbidden + baseline | done |
| 2 | Layer model: kinds → layers, built-in default rules, feature/sibling detection | done |
| 3 | HTTP app chrome in saflib; composition root mounts routers | done |
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
| 2 | App chrome | `http-app` | http-common, domain, integration, db, spec, objects | `service/http-app` (new) |
| 3 | Feature HTTP | `http` | http-common, domain, integration, db, spec, objects | `service/http`, `<offshoot>/http` |
| 4 | Shared HTTP | `http-common` | domain, integration, db, spec, objects | `service/http-common` |
| 5 | Domain | `domain` | integration, db, objects | `service/common`, `service/audit`, `service/jobs` |
| 6 | Integrations | `integration` | db, objects (from `state/` only) | `service/integrations/*` |
| 7 | Data | `db` | objects | `service/db`, `<offshoot>/db` |
| 7 | Contracts | `spec` | objects | `service/spec`, `<offshoot>/spec`, `spec-common` |
| 8 | Objects | `objects` | other objects | `<feature>/objects` |

*(Revised 2026-10-18, Phase 2: `spec` and `db` are siblings above `objects`, not a chain. Specs import objects packages (their schemas alias them), so objects sit below spec; and domain/db code must not depend on API contracts, so nothing below HTTP imports `spec`.)* `lib` and `other` stay unlayered: unchecked, importable by everything but objects. Same-kind imports follow the sibling rule and D2; see `saflib/imports/docs/01-overview.md`.

Client side, the same idea:

| Layer | `saf.kind` | May import |
| ----- | ---------- | ---------- |
| SPA | `spa` | vue, sdk, sdk-common, spec, objects |
| Vue components | `vue` | sdk, sdk-common, spec, objects |
| Feature SDK | `sdk` | sdk-common, spec, objects |
| SDK common | `sdk-common` | spec, objects |

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

- [x] Add the kinds `app`, `http-app`, `http-common`, `domain`, `objects`, `sdk-common` and `vue` to `@saflib/monorepo`'s kind list, and validate that every package declares a kind.
- [x] Built-in default rules generated from the layer table: layer order, sibling rule, `test` kind dev-only, integration internals rule. `safImports.boundaries.layers: false` opts out. Also `core-offshoot` (D2). Rules apply only between packages of the same product (same product root).
- [x] Feature detection (`saf.feature` override); unit tests. Implemented as the first directory under the product root (nearest ancestor with `service/`), not the parent dir, so `service/integrations/*` stay in the core feature.
- [x] Violation messages name the layer rule and suggest the move ("shared by billing/http and service/http → move to http-common").
- [x] Run on every product, and write baselines. The size of each baseline is the migration backlog. Base: clean (enforced by `product/workflows/base-boundaries.test.ts`; `runBaseJobs` now takes the API spec from the composition root). The large product that prototyped this plan baselined 18 layer violations.

### Phase 3 — HTTP app chrome and composition

- [x] Generalize the product-level HTTP app builder (mounts, security resolvers, public-route gate, error handling, SSE origins) into `@saflib/express` as `createProductHttpApp({ mounts, securityResolvers, isPublicRoute, … })`. The product's `http-app` package is a thin config wrapper. Done as staged hooks (`beforeGlobal`, `runInContext`, `beforeIdentity`, `publicRouters`, `isPublicRoute`/`deferAuth`, `afterAuth`, `mounts`, `platformRouters`); base has `service/http-app`; products add their own `http-app` package. Security resolvers stay on each route's scoped middleware.
- [x] Route-test harness (`acquireSlimRouteTest`-style) in `@saflib/express/test`. Mounts only the routers a test passes, so a feature http package tests itself without the whole product. `createRouteTestApp`; product harnesses build on their `http-app` package. Slim tests derive public routes from `x-public` (`publicRouteMatcher`).
- [x] Composition root (`service/monolith`) owns:
  - the production mount list, public-route list and startup tasks;
  - the merged spec for jobs/cron (multi-spec `runJobs`);
  - the all-specs security test.
- [x] Feature http packages export `create<Feature>Router()` only. Base: `createBaseRouter()`.

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
- 2026-10-18 — Phase 2 landed. Decisions while implementing: (1) objects sit below spec and db (specs alias objects schemas), and nothing below HTTP imports `spec`; (2) `lib`/`other` stay unlayered, importable by all but objects; (3) any feature's `objects` package may be used by the core (D2's "or in an objects package"); (4) an offshoot may use the core's domain/integration/db/spec/objects packages, never its http/sdk/vue (D2, extended to domain and integration); (5) a feature is the first directory under the product root, and product-root packages are core; (6) layer rules apply only within one product root, so framework (`@saflib/*`) imports are never layered.
- 2026-10-18 — Phase 3 landed: `createProductHttpApp`/`createRouteTestApp`/`publicRouteMatcher` in `@saflib/express`; an `http-app` package in base (and in the product that prototyped this); the reviewed public-route list moved to the composition root (with a test that it covers every `x-public` operation); jobs get their API specs from the composition root.
