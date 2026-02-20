# Overview

This package contains documentation and resources for a SAF monorepo.

Includes:

- `@saflib/monorepo` - constants and type utilities
- `@saflib/monorepo/tsconfig.json` - each package should import and extend it

See [Code Reference](./ref/index.md) for more information on package exports.

## Monorepo Structure

This is a recommended structure for a SAF monorepo, which works for one or more products. It does not need to be strictly adhered to; workflows are set up to be agnostic to the structure of the monorepo, and are more particular about how the packages are structured themselves rather than where they exist.

```
{repo-name}/
├── {product-name}/
│   ├── clients/
|   |   ├── account/
|   |   ├── admin/
|   |   ├── app/
|   |   ├── auth/
|   |   ├── build/
|   |   ├── common/
|   |   ├── links/
|   |   ├── root/
|   |   └── ...
│   ├── dev/
|   ├── notes/
│   ├── service/
|   |   ├── common/
│   │   ├── cron/
|   |   ├── db/
|   |   ├── http/
│   │   ├── identity/
│   │   ├── monolith/
|   |   ├── sdk/
|   |   ├── spec/
|   |   ├── ...
├── deploy/
├── notes/
├── saflib/
├── package-lock.json
└── package.json
```

## Directories Explained

### `{product-name}/clients/`

Clients as in web clients, desktop clients, and mobile clients. SAF only supports web clients currently.

Most web clients are expected to be Vue 3 single page apps with their own dedicated subdomain. Each SPA should have its own package within `clients/`, be named `{subdomain}/`, and depend on `@saflib/vue`. It exports a function which will run `createVueApp` for the SPA.

All web clients are built with a single Vite config in a `build` package in `clients/`. This package's main purpose is to provide a single entry point for developing and building all SPAs together. This includes a Dockerfile which copies all necessary files and npm installs them, such that the image could either run vite in development or build the static files for production.

There should also be a `common/` package which contains shared logic across SPAs, and a `links/` package which contains link objects for pages referenced by the server and other SPAs. The `links/` package is separate to isolate it from Vue and related dependencies so server-side code doesn't depend on those dependencies.

See docs for `@saflib/vue` for more information.

### `{product-name}/dev/`

Runs the application in development, using docker compose to run the clients (vite in dev mode), server, a caddy reverse proxy, and anything else necessary. The generated services includes `azurite`, a standin for Azure Blob Storage.

### `{product-name}/notes/`

Used for planning documents, including specs and roadmaps. Mostly used by the `@saflib/processes` package. It is one package with one folder for each project.

### `{product-name}/service/`

First, some terminology:

- **Library**: A package which contains shared logic.
- **Work**: Any long-running activity. A cron-job runner, an async job runner, or a server. May be executed by one or more workers.
- **Server**: Work which includes listening on a port. GRPC, HTTP, WS, FTP, etc.
- **Service**: A collection of work and servers which achieve a goal.
- **Monolith**: Two or more services running together.

Each `service/` directory is one of these.

| Package     | Description                                                               | Type     |
| ----------- | ------------------------------------------------------------------------- | -------- |
| common      | shared logic such as loggers and async local storage                      | library  |
| cron        | async job runner                                                          | worker   |
| db          | drizzle/pglite database                                                   | library  |
| grpc-client | gRPC client implementation                                                | library  |
| grpc-proto  | gRPC protocol definitions                                                 | library  |
| grpc-server | gRPC server implementation                                                | server   |
| http        | HTTP server                                                               | server   |
| identity    | runs SAF identity service, including its db, http server, and grpc server | service  |
| jobs        | async job runner                                                          | worker   |
| monolith    | runs all other servers and services in this directory                     | monolith |
| sdk         | shared frontend code that is tightly coupled to this service              | library  |
| spec        | OpenAPI specification                                                     | library  |

**Package dependency flow:** These packages form a layered dependency chain:

Service:

- `spec` and `db` have no dependencies - they define the API and database types respectively, and are distinct from one another (e.g., frontend has no direct dependency on how data is stored).`
- `http` depends on both `spec` and `db` and translates between the two data models.
- `sdk` depends on `spec`. This way frontend and backend are decoupled except for the API contract.
- Both `clients` and `service` packages have a `common` package.
- `service` wraps `http`, `grpc-server`, `cron`, and any other "runtimes" into a single runnable package, and `monolith` wraps that with `identity`.

Clients:

- All `clients` packages depend on `sdk` for API calls and shared components which are tightly coupled to the API contract.
- `links` and `common` are shared. `links` is separate so server-side code doesn't depend on Vue and related dependencies.
- The other packages are separate SPAs each serving their own subdomain, and the only thing that depends on them is the `build` package which builds them all together with Vite.

**Package naming convention:** Packages under `{product}/service/{name}/` are imported as `@{org}/{product}-{name}`. For example, if the product is `foobar` and the org is `acme`:

- `foobar/service/db/` → `@acme/foobar-db`
- `foobar/service/http/` → `@acme/foobar-http`
- `foobar/service/spec/` → `@acme/foobar-spec`
- `foobar/service/sdk/` → `@acme/foobar-sdk`
- `foobar/service/common/` → `@acme/foobar-service-common`

Third-party integrations can also be added along-side these packages. However, for consistency they should describe the service rather than be the name of the brand.

- `payments/`, not `stripe/`
- `email/`, not `sendgrid/`
- `notifications/`, not `twilio/`

These packages are considered "libraries"; they are like `grpc-client` or `sdk` packages in that they don't _run_ anything, they are simply code which is imported and run as part of some work.

### `deploy/`

Assuming you deploy all products to the same infrastructure, the `deploy/` directory is similar to the `dev/` directory, but for production. It includes scripts to build images, run them locally to test, and deploy to the remote infrastructure. The prod build is also used in CI with playwright.

## Deployment models: Standalone product vs product hub

You can run and deploy products in two ways. Both are supported; choose the one that fits how you operate.

### Standalone product model

Each product is independent:

- **Own domain** (e.g. `recipes.net`, `notebook.ai`, in prod).
- **Own identity service** — each product runs its own identity (db, sessions, auth UI).
- **Own dev environment** — each `{product}/dev/` has its own docker-compose (caddy, vite clients, monolith, azurite).
- **Own monolith in production** — deploy runs separate containers (e.g. `recipes-monolith`, `notebook-monolith`), each serving one product and their own identity service.

Good when products are run or deployed separately, or when you want minimal coupling between them.

### Product hub model

Products share one domain and one identity:

- **Single domain** (e.g. `myhome.online`). All products use subdomains of that domain (e.g. `recipes.myhome.online`, `notebook.myhome.online`).
- **Shared identity** — one identity service (hub-owned). Users log in once; sessions and auth apply across all products. Auth UI lives at a single `auth.{domain}`; products redirect there for login/register.
- **Hub dev** — `hub/dev/` runs the hub monolith (identity + hub + recipes + notebook services). Hub clients run on Vite; recipes and notebook clients are static builds served by Caddy. Each product can also still have its own `{product}/dev/` for that product’s dev in standalone style, to still develop one product without building/running the other products.
- **Single monolith in production** — one `monolith` container runs all services. Caddy serves static client builds for all products and proxies API subdomains (`api.recipes.{domain}`, `api.notebook.{domain}`, `hub.{domain}`) to that monolith.

Good when you want one login across products, one deployment unit, and a single domain.

### How they differ

| Aspect           | Standalone product             | Product hub                          |
| ---------------- | ------------------------------ | ------------------------------------ |
| Domain           | One per product                | One for all (subdomains per product) |
| Identity         | Per-product                    | Single (hub)                         |
| Auth UI          | Per-product auth subdomain     | Single `auth.{domain}`               |
| Deploy monoliths | One container per product      | One container (hub monolith)         |
| Link subdomains  | Product-specific (`app`, etc.) | Product-prefixed (`app.recipes`, …)  |

The repo can support both: e.g. use hub dev and hub deploy for the “one domain, one identity” setup, and keep per-product dev and optional standalone deploy for the other model.

### `saflib/`

A git submodule which contains [the SAF source](https://github.com/sderickson/saflib), so they can be referenced, edited, and used directly. One day these may be more traditionally published and installed through npm, but for projects which will also invest heavily in this shared codebase, a submodule is the way to go.

Note that `saflib/` has its own git history. Changes to files under `saflib/` are tracked in the submodule, not in the parent repo. The parent repo only tracks which submodule commit is checked out.

## Testing

Each package has its own `vitest.config.js` and tests are run from within the package directory:

```bash
cd {product}/service/http && npm run test
```

To run a specific test file, pass a filter after `--`:

```bash
cd {product}/service/http && npx vitest run -- routes/scans/execute
```

The workspace-root `vitest.config.ts` configures workspace-level projects, but individual test files should be run from their package directory.

Each package also has its own `tsconfig.json` which can be checked with the command `npm run typecheck`.

For testing specific types of packages, see documentation inside the appropriate `saflib/` package, such as in [`saflib/drizzle/docs/`](../../drizzle/docs/04-testing.md) for database packages.
