# Hub Repo Specification

## Overview

This spec describes how to evolve a SAF monorepo from independent products (each with their own identity service, domain, and dev environment) into a hub-based system where products share a single identity service under one domain. The hub product owns authentication, and other products delegate auth to it. In development, products compose only the backend services they need, and the product under active development runs vite while others are served as static builds.

### Goals

- **Shared identity**: All products share a single identity service (owned by hub), a single user database, and a single session store. Users log in once and have access across products.
- **Single domain**: All products live under one domain (e.g. `scotterickson.info`) with product-specific subdomain prefixes (e.g. `recipes.scotterickson.info`, `notebook.scotterickson.info`).
- **Minimal dev resources**: In development, only the target product's clients run vite; all other products' clients are served as static builds by caddy. Backend monoliths run only the services necessary for the target product.
- **Clean service/monolith separation**: Service packages export composable `start*Service()` functions. Monolith packages compose the specific set of services needed for each product's development and deployment.

### Current State

Each product (recipes, notebook, hub) is fully independent:

- **Separate identity services**: Each product runs its own identity service with its own SQLite database and session store.
- **Separate domains**: `recipes.docker.localhost`, `notebook.docker.localhost`, `hub.docker.localhost` in dev; separate domains in production.
- **Separate dev environments**: Each `{product}/dev/` has its own docker-compose with caddy, vite clients, monolith, and azurite.
- **Separate monolith containers in deploy**: `recipes-monolith`, `notebook-monolith`, `hub-monolith` each run independently behind one caddy instance.
- **Collapsed service/monolith**: The monolith `index.ts` currently duplicates the service package's `start*Service()` function rather than importing it, since the bifurcation was unnecessary when each product stood alone.

## Domain and Subdomain Architecture

All products share a single root domain. Products are distinguished by a subdomain prefix, and each product's SPAs are further nested subdomains.

### Subdomain Layout

Using `scotterickson.info` as the example domain:

| URL                                   | Purpose                            |
| ------------------------------------- | ---------------------------------- |
| `scotterickson.info`                  | Hub root SPA                       |
| `app.scotterickson.info`              | Hub app SPA                        |
| `auth.scotterickson.info`             | Shared auth SPA (hub-owned)        |
| `account.scotterickson.info`          | Hub account SPA                    |
| `admin.scotterickson.info`            | Hub admin SPA                      |
| `recipes.scotterickson.info`          | Recipes root SPA                   |
| `app.recipes.scotterickson.info`      | Recipes app SPA                    |
| `admin.recipes.scotterickson.info`    | Recipes admin SPA                  |
| `account.recipes.scotterickson.info`  | Recipes account SPA                |
| `notebook.scotterickson.info`         | Notebook root SPA                  |
| `app.notebook.scotterickson.info`     | Notebook app SPA                   |
| `admin.notebook.scotterickson.info`   | Notebook admin SPA                 |
| `account.notebook.scotterickson.info` | Notebook account SPA               |
| `identity.scotterickson.info`         | Identity service (single instance) |
| `api.recipes.scotterickson.info`      | Recipes API proxy                  |
| `api.notebook.scotterickson.info`     | Notebook API proxy                 |
| `hub.scotterickson.info`              | Hub API proxy                      |
| `grafana.scotterickson.info`          | Grafana (admin-only)               |
| `prometheus.scotterickson.info`       | Prometheus (admin-only)            |

### Key Decisions

- **API subdomains use `api.{product}` prefix** rather than mixing API and client servers on the same subdomain. E.g. `api.recipes.scotterickson.info` for the recipes API, not `recipes.scotterickson.info`. This way `recipes.scotterickson.info` is the recipes landing page.
- **Auth is hub-only**: There is one `auth.scotterickson.info`, not per-product auth subdomains. Products that need auth redirect to this single auth flow.
- **`CLIENT_SUBDOMAINS`** would include: `,app,auth,account,admin,recipes,app.recipes,admin.recipes,account.recipes,notebook,app.notebook,admin.notebook,account.notebook` (and grafana, prometheus, etc).
- **`SERVICE_SUBDOMAINS`** would include: `identity,hub,api.recipes,api.notebook`.

### Environment Variable: `DOMAIN`

The `DOMAIN` env var remains a single value: the root domain (e.g. `scotterickson.info`). This works because:

- The identity service's session cookie is set on `.scotterickson.info`, covering all subdomains including nested ones like `app.recipes.scotterickson.info`.
- CORS whitelisting constructs origins from `CLIENT_SUBDOMAINS` x `DOMAIN`, which naturally covers all product subdomains.

However, client-side code needs to know its product's domain segment. The `@saflib/links` package constructs URLs by prepending a link's `subdomain` to `DOMAIN`. Today, a recipes link like `{ subdomain: "app", path: "/" }` produces `app.recipes.docker.localhost`. In the hub model, the same link needs to produce `app.recipes.scotterickson.info`. This means **link subdomains must include the product prefix**: the recipes app link becomes `{ subdomain: "app.recipes", path: "/" }` and the recipes root link becomes `{ subdomain: "recipes", path: "/" }`.

Similarly, `setClientName` (called at SPA startup) would need to be set to e.g. `"app.recipes"` for the recipes app SPA rather than just `"app"`. The `getHost()` function strips the client name from `document.location.host` to derive the base domain, so this should work as-is: `app.recipes.scotterickson.info` minus `app.recipes` = `scotterickson.info`.

The hub's own links keep short subdomains (`"app"`, `"auth"`, `"account"`) since they live directly under the root domain.

### Vite Dev Server

`@saflib/vite/vite.config.ts` uses `CLIENT_SUBDOMAINS` and `DOMAIN` to map incoming requests to the right `index.html`. The `subDomainProxyPlugin` strips the domain from the host to derive a subdomain path (e.g. `app.recipes` -> `/app.recipes/index.html`). With the expanded `CLIENT_SUBDOMAINS`, this should work for nested subdomains, but the client build directory structure would need to match: `app.recipes/index.html` rather than just `app/index.html`. This needs to be verified and potentially adjusted in the vite config plugin and the client build structure.

## Shared Identity Service

### Consolidation

- Hub's identity package (`hub/service/identity/`) becomes **the** identity service for all products.
- **Remove** `recipes/service/identity/` and `notebook/service/identity/` packages. These currently each have their own SQLite database and identical callback implementations.
- One identity database, one session store, one set of callbacks (hub's).
- All `forward_auth` directives in caddy point to the single `IDENTITY_SERVICE_HTTP_HOST`.

### Session Cookies

The session cookie configuration in `@saflib/identity-http` already sets `domain: .${typedEnv.DOMAIN}`. With `DOMAIN=scotterickson.info`, the cookie domain becomes `.scotterickson.info`, which covers all subdomains including nested ones like `app.recipes.scotterickson.info`. No changes needed here.

### Auth Redirect Flow

New behavior when an unauthenticated user visits a product page:

1. User visits `app.recipes.scotterickson.info`.
2. Caddy's `forward_auth` contacts the identity service, which returns 401.
3. The recipes app SPA detects the 401 and redirects to `auth.scotterickson.info?redirect=app.recipes.scotterickson.info` (or encodes the origin in a query param).
4. User authenticates on `auth.scotterickson.info`.
5. After successful auth, hub redirects back to the URL specified in the `redirect` param.
6. The session cookie (scoped to `.scotterickson.info`) is now set, so subsequent `forward_auth` calls succeed.

The identity service must validate that redirect targets are within the known domain to prevent open redirect vulnerabilities.

### Identity Callbacks

Currently each product has identical callback implementations (TODOs for email sending). With shared identity, hub's callbacks handle all products. If product-specific behavior is ever needed (e.g. different welcome emails per product), the callback system could be extended with product context, but this is not needed initially.

## Service and Monolith Package Architecture

### Service Packages (Composable Units)

Each product's service package exports a function that starts that product's backend. These remain unchanged in structure:

| Package                              | Export                   | What it does                                         |
| ------------------------------------ | ------------------------ | ---------------------------------------------------- |
| `hub/service/hub-service/`           | `startHubService()`      | Connects hub-db, starts hub Express server           |
| `recipes/service/recipes-service/`   | `startRecipesService()`  | Connects recipes-db, starts recipes Express server   |
| `notebook/service/notebook-service/` | `startNotebookService()` | Connects notebook-db, starts notebook Express server |

Currently the monolith `index.ts` duplicates the service package code. This needs to be cleaned up: the monolith should import from the service package rather than re-implementing the same function.

Each service listens on its own port, derived from its `*_SERVICE_HTTP_HOST` env var. For a development monolith where all services run in one process:

| Service       | Env Var                      | Example Value    |
| ------------- | ---------------------------- | ---------------- |
| Identity HTTP | `IDENTITY_SERVICE_HTTP_HOST` | `monolith:3000`  |
| Identity gRPC | `IDENTITY_SERVICE_GRPC_HOST` | `monolith:50051` |
| Hub HTTP      | `HUB_SERVICE_HTTP_HOST`      | `monolith:3001`  |
| Recipes HTTP  | `RECIPES_SERVICE_HTTP_HOST`  | `monolith:3002`  |
| Notebook HTTP | `NOTEBOOK_SERVICE_HTTP_HOST` | `monolith:3003`  |

### Monolith Packages (Composition Points)

Each product has a monolith package that composes the set of services needed for that product. The monolith handles telemetry setup (Sentry, Loki, metrics), env validation, and starting the appropriate services.

**Recipes monolith** (`recipes/service/monolith/run.ts`):

```typescript
// validates env, sets up telemetry, then:
startHubIdentityService(); // shared identity
startHubService(); // hub backend (needed for auth redirects, hub API)
startRecipesService(); // recipes backend
```

**Notebook monolith** (`notebook/service/monolith/run.ts`):

```typescript
startHubIdentityService();
startHubService();
startNotebookService();
```

**Hub monolith** (`hub/service/monolith/run.ts`):

```typescript
startHubIdentityService();
startHubService();
// no other product services needed for hub development
```

Each product's monolith only runs what's necessary for that product. This keeps development streamlined as more products are added.

### Production Deploy Monolith

In production, the deploy monolith runs everything:

```typescript
startHubIdentityService();
startHubService();
startRecipesService();
startNotebookService();
```

This could live in an existing product's monolith (e.g. hub's, since it's the central one) or in a dedicated `deploy/monolith/` package. The Dockerfile for this monolith copies all products' service code.

Alternatively, production could continue running per-product monolith containers (as today) but with each one pointing `forward_auth` at hub's identity. This trades resource efficiency for deployment isolation. The choice depends on infrastructure constraints.

## Development Environment

### Docker Compose Structure

Each `{product}/dev/docker-compose.yaml` runs:

1. **caddy** - Reverse proxy routing all subdomains. Also serves static builds of non-target products' clients directly (no separate containers for static file serving).
2. **{product}-clients** - Vite dev server for the target product's SPAs (with HMR, volume mounts).
3. **monolith** - Single node process running identity + hub + target product's backend services.
4. **azurite** - Azure Blob Storage emulator.

### Example: Recipes Dev

```yaml
services:
  caddy:
    # Routes all subdomains for scotterickson.docker.localhost
    # Serves hub and notebook static builds from /srv/hub-clients/ and /srv/notebook-clients/
    # Proxies recipes client subdomains to recipes-clients:5173
    # Proxies API/identity subdomains to monolith
    volumes:
      - hub-client-build:/srv/hub-clients
      - notebook-client-build:/srv/notebook-clients

  recipes-clients:
    # Vite dev server, port 5173
    # Volume mounts for HMR on recipes client code + sdk

  monolith:
    # Runs: identity (3000) + hub (3001) + recipes (3002)
    # Does NOT run notebook service
```

### Example: Hub Dev

```yaml
services:
  caddy:
    # Serves recipes and notebook static builds
    # Proxies hub client subdomains to hub-clients:5173
    volumes:
      - recipes-client-build:/srv/recipes-clients
      - notebook-client-build:/srv/notebook-clients

  hub-clients:
    # Vite dev server for hub SPAs

  monolith:
    # Runs: identity (3000) + hub (3001)
    # No other product services needed
```

### Caddy Configuration

Caddy needs to handle two modes per subdomain: vite proxy (for the target product) and static file serving (for everything else). This can be managed via environment variables or separate Caddyfile snippets.

A possible approach: caddy imports product-specific Caddyfile snippets, and each dev environment provides its product's snippet configured for vite while other products' snippets are configured for static serving. The `DISABLE_VITE_DEV_SERVER` pattern already exists in deploy's caddy config and could be extended per-product.

## Caddy Routing (Production)

### Merged Caddyfile

With a shared domain, the per-product Caddyfiles (`recipes.Caddyfile`, `notebook.Caddyfile`, `hub.Caddyfile`) merge under one domain. Key changes:

- All `forward_auth` directives reference `{$IDENTITY_SERVICE_HTTP_HOST}` (one identity service).
- API subdomains use `api.{product}` prefix: `api.recipes.{$DOMAIN}`, `api.notebook.{$DOMAIN}`.
- Product client subdomains include the product prefix: `app.recipes.{$DOMAIN}`, `admin.recipes.{$DOMAIN}`, etc.
- Identity routes exist only at `identity.{$DOMAIN}` (no per-product identity subdomains).
- Auth SPA exists only at `auth.{$DOMAIN}`.

### Example Snippets

```caddyfile
# Hub (no product prefix)
{$PROTOCOL}://{$DOMAIN} {
    import hub-spa /root/index.html
}
{$PROTOCOL}://app.{$DOMAIN} {
    import hub-spa /app/index.html
}
{$PROTOCOL}://auth.{$DOMAIN} {
    import hub-spa /auth/index.html
}
{$PROTOCOL}://hub.{$DOMAIN} {
    import api-proxy {$IDENTITY_SERVICE_HTTP_HOST} {$HUB_SERVICE_HTTP_HOST}
}

# Recipes (product-prefixed subdomains)
{$PROTOCOL}://recipes.{$DOMAIN} {
    import recipes-spa /root/index.html
}
{$PROTOCOL}://app.recipes.{$DOMAIN} {
    import recipes-spa /app/index.html
}
{$PROTOCOL}://api.recipes.{$DOMAIN} {
    import api-proxy {$IDENTITY_SERVICE_HTTP_HOST} {$RECIPES_SERVICE_HTTP_HOST}
}

# Shared identity
{$PROTOCOL}://identity.{$DOMAIN} {
    import identity {$DOMAIN} {$IDENTITY_SERVICE_HTTP_HOST}
}
```

## gRPC

The existing gRPC setup (identity gRPC server for inter-service communication) is preserved. Even though services run in the same process, maintaining gRPC enforces logical separation and keeps the architecture ready for future service splitting. The gRPC host would be on the monolith container at port 50051.

## Migration Steps

A rough ordering of the work:

1. **Re-separate service packages from monoliths**: Clean up monolith `index.ts` to import `start*Service()` from the service package rather than duplicating the code.
2. **Update link subdomains**: Change product link definitions to include the product prefix (e.g. `"app"` -> `"app.recipes"`). Verify `setClientName`, `getHost`, and `linkToHref` work with nested subdomains.
3. **Verify vite config**: Ensure the `subDomainProxyPlugin` and build input structure handle nested subdomain paths (e.g. `app.recipes/index.html`).
4. **Consolidate identity to hub**: Remove per-product identity packages. Point all `forward_auth` to hub's identity service.
5. **Implement auth redirect flow**: Add redirect param support to the auth SPA and identity service. Validate redirect targets.
6. **Update env files**: Single `DOMAIN`, expanded `CLIENT_SUBDOMAINS` and `SERVICE_SUBDOMAINS`, per-service HTTP host vars.
7. **Restructure caddy configs**: Merge per-product Caddyfiles under one domain, add `api.*` subdomains.
8. **Update dev docker-compose files**: Each product's dev setup runs its own monolith (with appropriate services), vite for its own clients, and caddy serving static builds for other products.
9. **Update deploy**: Single monolith (or restructured per-product monoliths pointing at hub identity), merged caddy config.
10. **Update `01-overview.md`**: Reflect the hub model in the monorepo documentation.

## Open Questions

- **Product-specific account/admin SPAs**: Do recipes and notebook need their own `account.*` and `admin.*` subdomains, or can these be centralized in hub?
  - They should continue to have their own admin SPA (to administer that product), and I think also they should have their own account SPA for product-specific account configuration. It _might_ make sense to redirect to the hub's account SPA for identity-service specific fields like name and email. But that feels like an optimization for later.
- **Client build artifacts for static serving**: How are non-target products' client builds provided to caddy in dev? Pre-built images, volume mounts from a build step, or multi-stage Docker builds?
  - The same way production build pull them in I think. Probably need a Dockerfile.dev similar to Dockerfile.prod in deploy right now. And that'll have commands like COPY --from=recipes-builder /app/recipes/clients/build/dist /srv/recipes-clients
- **Deploy topology**: Single uber-monolith container, or per-product containers that all point at hub's identity? The former is simpler; the latter offers deployment isolation.
  - uber-monolith container. The way I have things set up, it wouldn't be too hard to manually break things down into per-product containers later if needed.
- **Vite config and build directory structure**: Does the nested subdomain approach (`app.recipes/index.html`) work with the existing vite MPA setup, or does the build structure need rethinking?
  - I think it should work. If it doesn't then... yes!
