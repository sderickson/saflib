# Overview

This package contains documentation and resources for a SAF monorepo.

Includes:

- `@saflib/monorepo` - constants and type utilities
- `@saflib/monorepo/tsconfig.json` - each package should import and extend it

See [Code Reference](./ref/index.md) for more information on package exports.

## Monorepo Structure

This is a recommended structure for a SAF monorepo. It serves as a reasonable layout for a single product (SAF is not designed for multiple products in the same repo). It does not need to be strictly adhered to; workflows are set up to be agnostic to the structure of the monorepo, and are more particular about how the packages are structured themselves rather than where they exist.

```
{repo-name}/
├── clients/
├── deploy/
├── integrations/
├── notes/
├── saflib/
├── services/
├── package-lock.json
└── package.json
```

## Directories Explained

### `clients/`

Clients as in web clients, desktop clients, and mobile clients. SAF only supports web clients currently.

Most web clients are expected to be Vue 3 single page apps with their own dedicated subdomain. Each SPA should have its own package within `clients/`, be named `web-{subdomain}`, and depend on `@saflib/vue`. It exports a function which will run `createVueApp` for the SPA.

All web clients are built with a single Vite config in a `spas` package in `clients/`. This package's main purpose is to provide a single entry point for developing and building all SPAs together. This includes a Dockerfile which copies all necessary files and npm installs them, such that the image could either run vite in development or build the static files for production.

There should also be a `@saflib/web-common` package which contains shared logic across SPAs.

See docs for `@saflib/vue` for more information.

### `deploy/`

Each "deployment" (either for local development or remote) should have its own directory in `deploy/`. At minimum, there should be `dev` deployment and a `prod` deployment, though there can be others such as focused local deployments for focused development, or staging/canary deployments. These directories own docker compose files, configurations, build/deploy scripts, and default environment files.

This area is not thoroughly developed, and may be moved over to use Nix instead. The SAF template is the source of truth for how deployments are currently set up and run. It's fairly manual.

### `integrations/`

Integration packages integrate with external services. They are expected to be named `@org-name/{service-name}`, e.g. `@saflib/stripe`.

Integration packages mainly differ from regular packages in that they must include a mock of the service, per [best practices](../../best-practices.md#mock-fake-and-shim-service-boundaries). They should return a mock client when `NODE_ENV` is `test` or `MOCK_INTEGRATIONS` is `true`.

### `notes/`

Used for planning documents, including specs (PRDs) and roadmaps. Mostly used by the `@saflib/processes` package. It is one package with one folder for each project.

### `saflib/`

A git submodule which contains [the SAF source](https://github.com/sderickson/saflib), so they can be referenced, edited, and used directly. One day these may be more traditionally published and installed through npm, but for projects which will also invest heavily in this shared codebase, a submodule is the way to go.

### `services/`

A service is an absolute unit of backend. It typically will be composed of some combination of:

- An HTTP server
- A gRPC server
- Cron jobs
- A database

There's nothing particularly stopping a service from running multiples of each of these, but should be uncommon if not avoided.

Currently these all not only run on the same machine, they all run on the same process. However, they are broken up into separate packages and may be run separately (or shared, in the case of the database).

Services should be separated by domain, such as having separate services for:

- identity
- payments
- each core application

Third-party integrations, or systems which could be swapped out for a third-party integration, typically make good separate services.

Services should be small enough to be owned by a single team.
