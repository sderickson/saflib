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

Third-party integrations can also be added along-side these packages. However, for consistency they should describe the service rather than be the name of the brand.

- `payments/`, not `stripe/`
- `email/`, not `sendgrid/`
- `notifications/`, not `twilio/`

These packages are considered "libraries"; they are like `grpc-client` or `sdk` packages in that they don't _run_ anything, they are simply code which is imported and run as part of some work.

### `deploy/`

Assuming you deploy all products to the same infrastructure, the `deploy/` directory is similar to the `dev/` directory, but for production. It includes scripts to build images, run them locally to test, and deploy to the remote infrastructure. The prod build is also used in CI with playwright.

### `saflib/`

A git submodule which contains [the SAF source](https://github.com/sderickson/saflib), so they can be referenced, edited, and used directly. One day these may be more traditionally published and installed through npm, but for projects which will also invest heavily in this shared codebase, a submodule is the way to go.
