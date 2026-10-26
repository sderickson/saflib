# Product Architecture

A SAF product is a workspace monorepo of small packages. Each package declares its **layer** as `saf.kind` in `package.json`, and `saf-imports boundaries` checks every import against the layers. This page is the map; the [boundaries docs](./imports/docs/01-overview.md#package-boundaries) are the precise rules.

To see a product's layout, run `npm exec saf-imports map` (and `--package <name>` for one package); the dev-site's checkout page draws the same graph.

## The rule: move it down, never sideways

A package imports only layers below its own. When two packages need the same code, it moves **down** a layer to a package both can import. It is never imported **sideways** from a sibling, and never injected at runtime with a `bind*()` call. The checker's messages say where shared code should go.

## Server layers

| Layer        | `saf.kind`    | May import                                          | Base template                                        |
| ------------ | ------------- | --------------------------------------------------- | ---------------------------------------------------- |
| Composition  | `app`         | anything                                            | `service/monolith`                                   |
| App chrome   | `http-app`    | http-common, domain, integration, db, spec, objects | `service/http-app`                                   |
| Feature HTTP | `http`        | http-common, domain, integration, db, spec, objects | `service/http`, `<offshoot>/http`                    |
| Shared HTTP  | `http-common` | domain, integration, db, spec, objects              | created when two http packages share code            |
| Domain       | `domain`      | integration, db, objects                            | `service/common`, `service/audit`, `service/jobs`, … |
| Integrations | `integration` | db, objects (from `state/` only)                    | `service/integrations/*`                             |
| Data         | `db`          | objects                                             | `service/db`, `<offshoot>/db`                        |
| Contracts    | `spec`        | objects                                             | `service/spec`, `<offshoot>/spec`                    |
| Objects      | `objects`     | other objects                                       | created when db and spec share business objects      |

Nothing below HTTP imports a `spec`: API contracts are for the HTTP and SDK layers. Business objects that db, domain and spec code all need live in an `objects` package, and specs alias them.

## Client layers

| Layer          | `saf.kind`   | May import                          | Base template                   |
| -------------- | ------------ | ----------------------------------- | ------------------------------- |
| SPA            | `spa`        | vue, sdk, sdk-common, spec, objects | `clients/*`                     |
| Vue components | `vue`        | sdk, sdk-common, spec, objects      | `clients/common`                |
| Feature SDK    | `sdk`        | sdk-common, spec, objects           | `service/sdk`, `<offshoot>/sdk` |
| SDK common     | `sdk-common` | spec, objects                       | `service/sdk-common`            |

`test` packages may import anything, and only test files may import them. `lib` and `other` packages aren't layered yet.

## Features and offshoots

A **feature** is the first directory under the product root. The **core** is one feature made of `service/`, `clients/` and packages directly in the product root; each offshoot (`<offshoot>/{db,spec,http,sdk,test}`) is its own feature. A package that lives in its own directory but is really core sets `saf.feature: "service"` in `package.json`.

- An offshoot may use the core's `domain`, `integration`, `db`, `spec` and `objects` packages, never the core's `http` or `sdk`.
- The core never references an offshoot. The composition root wires offshoots in: `service/monolith/http.ts` mounts each offshoot's router (`express/init` adds it), and SPAs import offshoot SDKs directly.
- Two exceptions keep one database and shared vocabulary workable: the core db's schema index re-exports offshoot tables (one migration history), and any feature's `objects` package may be shared.

## Who owns what

- **The composition root** (`app`) owns the production mount list, the reviewed public-route list, process-level wiring (`dependencies.ts`: secret store, integration clients) and startup tasks.
- **The `http-app` package** builds the app shell with `createProductHttpApp` from `@saflib/express`. Feature http packages export one router each, and their route tests mount only that router.
- **The service context** (`service/common`) holds infrastructure handles only: db keys, object stores, and the email client. It never constructs integration clients.
- **Each SDK** makes its own API client from `sdk-common`'s factory, typed by its own spec.
- **Integration packages** keep client code (`client.ts`, `calls/`, `bin/`) apart from product state (`state/`).
