## Migration Steps

See [spec.md](spec.md) for the spec.

### Phase 1: Service/monolith separation (no behavioral changes)

Refactor internals without changing any runtime behavior. Everything should work exactly as before when done.

**Step 1.1: Re-separate service packages from monoliths**

Each product's monolith `index.ts` currently duplicates the service package's `start*Service()` function. Change the monolith to import from the service package instead.

For each product (recipes, notebook, hub):

- Ensure `{product}/service/{product}-service/index.ts` exports `start{Product}Service()`.
- Change `{product}/service/monolith/index.ts` to import and re-export `start{Product}Service` from the service package.
- Remove the duplicated DB connection / Express setup code from the monolith `index.ts`.

**Test**: Run each product's existing dev environment (`npm run dev` in `{product}/dev/`). Everything should work identically — pages load, API calls work, auth works. Run existing unit tests (`npm run test` in each service package). Run `npm run typecheck` in each modified package.

---

### Phase 2: Links and vite support for nested subdomains (unit-testable)

Update the link and vite infrastructure to support product-prefixed subdomains like `app.recipes`. This can be validated with unit tests before touching any docker/caddy config.

**Step 2.1: Add unit tests for nested subdomains in `@saflib/links`**

Add test cases to `saflib/links/utils.test.ts` that exercise the hub subdomain model:

- `linkToHref({ subdomain: "app.recipes", path: "/" }, { domain: "scotterickson.info" })` should produce `http://app.recipes.scotterickson.info/`.
- `linkToHref({ subdomain: "recipes", path: "/" }, { domain: "scotterickson.info" })` should produce `http://recipes.scotterickson.info/`.
- `linkToHref({ subdomain: "", path: "/" }, { domain: "scotterickson.info" })` should produce `http://scotterickson.info/` (hub root).
- `setClientName("app.recipes")` with `document.location.hostname = "app.recipes.scotterickson.info"` should not throw.
- `getHost()` after `setClientName("app.recipes")` with `host = "app.recipes.scotterickson.info"` should return `scotterickson.info`.
- `linkToProps` with `clientName = "app.recipes"` should return `{ to: "/" }` for a link with `subdomain: "app.recipes"` and `{ href: ... }` for `subdomain: "app.notebook"`.

**Test**: `cd saflib/links && npx vitest run`. These tests should pass without any code changes to `utils.ts` — the existing implementation should already handle dotted subdomains. If any test fails, fix the implementation.

**Step 2.2: Update product link definitions**

Change each product's `clients/links/` files to include the product prefix in subdomain strings:

- Recipes: `const subdomain = "app"` → `const subdomain = "app.recipes"`, etc.
- Notebook: `const subdomain = "app"` → `const subdomain = "app.notebook"`, etc.
- Hub: No changes (hub links stay `"app"`, `"auth"`, `"account"`, etc.).

Update `setClientName` calls in each product's SPA entry points to match (e.g. `setClientName("app.recipes")`).

**Test**: `npm run typecheck` in each modified links package. These are type-only changes (string values), so typechecking confirms nothing broke structurally. Full integration testing comes later.

**Step 2.3: Verify vite config handles nested subdomain paths**

The `subDomainProxyPlugin` in `@saflib/vite/vite.config.ts` derives a subdomain from the host and rewrites `req.url` to `/{subdomain}/index.html`. With a host like `app.recipes.docker.localhost` and domain `docker.localhost`, it should produce `/app.recipes/index.html`.

Check the logic:

```typescript
const subdomain = host
  .replace(`${domain}`, "")
  .split(".")
  .filter(Boolean)
  .join(".");
```

For `app.recipes.docker.localhost` with domain `docker.localhost`: `"app.recipes.docker.localhost".replace("docker.localhost", "")` → `"app.recipes."` → split/filter/join → `"app.recipes"` → url becomes `/app.recipes/index.html`. This looks correct.

The client build directory structure would need `app.recipes/index.html` instead of `app/index.html`. This is a build-time concern addressed in the client build package's vite config (the `input` map comes from `CLIENT_SUBDOMAINS`). With `CLIENT_SUBDOMAINS` including `app.recipes`, the input map would have `{ "app.recipes": "app.recipes/index.html" }`, so the SPA entry HTML files would need to live at those paths.

**Test**: This can be verified by temporarily setting `CLIENT_SUBDOMAINS=,app.recipes,recipes` and creating a test `app.recipes/index.html` in a client build dir, then running vite dev and hitting `app.recipes.docker.localhost`. But this is easier to test as part of Phase 4, so just confirm the logic is correct by reading the code for now.

---

### Phase 3: Identity consolidation (backend-only, testable in isolation)

Consolidate to a single identity service. This can be tested by running a single product's dev environment with the hub identity service instead of its own.

**Step 3.1: Make product monoliths use hub's identity service**

For recipes and notebook monoliths:

- Change `run.ts` to import `startHubIdentityService` from `@sderickson/hub-identity` instead of `start{Product}IdentityService` from `@sderickson/{product}-identity`.
- Update `package.json` dependencies accordingly.
- Update `env.schema.combined.json` if needed (the identity env vars should be the same).

**Test**: Run `npm run dev` in `recipes/dev/`. The recipes app should start up, and you should be able to register, log in, and use the app normally. The only difference is the identity service code comes from hub's package — but since all three identity packages are identical wrappers around `@saflib/identity`, this should be transparent. Repeat for notebook.

**Step 3.2: Remove per-product identity packages**

Once step 3.1 is verified:

- Delete `recipes/service/identity/` and `notebook/service/identity/`.
- Remove their entries from the workspace `package.json`.
- Clean up any references.

**Test**: `npm run typecheck` across the repo. Run `npm run dev` for recipes and notebook again to confirm nothing broke.

---

### Phase 4: Single-domain dev environment for one product

This is the big integration step. Pick one product (suggest recipes) and get its dev environment running under the hub domain model. This involves docker-compose, caddy, env vars, and the client build changes all coming together.

**Step 4.1: Update recipes env vars for hub domain model**

Create a new `recipes/dev/env.dev` (or modify existing) with:

- `DOMAIN=docker.localhost` (single root domain)
- `CLIENT_SUBDOMAINS=,app,auth,account,admin,recipes,app.recipes,admin.recipes,account.recipes`
- `SERVICE_SUBDOMAINS=identity,api.recipes`
- `IDENTITY_SERVICE_HTTP_HOST=monolith:3000`
- `RECIPES_SERVICE_HTTP_HOST=monolith:3002`

**Step 4.2: Update recipes client build structure**

Rename or restructure the recipes client SPAs so the build outputs match the nested subdomain paths:

- `app/` → produces output at `app.recipes/`
- `root/` → produces output at `recipes/`
- `admin/` → produces output at `admin.recipes/`
- `account/` → produces output at `account.recipes/`
- `auth/` → removed (auth is hub-only now)

The vite `input` map and directory structure in `recipes/clients/build/` need to reflect these paths. The `CLIENT_SUBDOMAINS` env var drives the input map, so with the new subdomains, paths should resolve correctly — but the actual HTML entry files need to exist at those paths.

**Step 4.3: Write new recipes dev Caddyfile**

New caddy config for recipes dev that:

- Proxies `app.recipes.docker.localhost`, `recipes.docker.localhost`, etc. to `recipes-clients:5173` (vite)
- Proxies `auth.docker.localhost`, `app.docker.localhost`, etc. to static hub client builds (served by caddy itself)
- Proxies `api.recipes.docker.localhost` to `monolith:3002` with `forward_auth` to `monolith:3000`
- Proxies `identity.docker.localhost` to `monolith:3000`

**Step 4.4: Update recipes dev docker-compose**

- `caddy`: New Caddyfile, plus volume or COPY for hub's static client build.
- `recipes-clients`: Vite dev server, `DOMAIN=docker.localhost`, updated `CLIENT_SUBDOMAINS`.
- `monolith`: Runs `startHubIdentityService()` + `startRecipesService()`. Env vars for both services.
- `azurite`: Unchanged.

Need a Dockerfile (or build step) for caddy that includes hub's static client build. Similar pattern to `deploy/Dockerfile.prod`: multi-stage build that copies from `hub-builder`.

**Step 4.5: Update recipes monolith for hub domain**

The monolith `run.ts` already imports hub identity (from Phase 3). Ensure env validation accepts the new env var shape (single DOMAIN, etc.).

**Test — the big one**: `npm run dev` in `recipes/dev/`. Then:

1. **Health check**: `curl http://identity.docker.localhost/health` and `curl http://api.recipes.docker.localhost/health` both return 200.
2. **Static hub auth page loads**: Visit `http://auth.docker.localhost` in a browser — the hub auth SPA should render (static build).
3. **Recipes vite page loads**: Visit `http://app.recipes.docker.localhost` — the recipes app SPA should render via vite with HMR working.
4. **Auth flow works**: From the recipes app, trigger a login (401 → redirect to `auth.docker.localhost`). Register/log in. After auth, session cookie is set on `.docker.localhost`. Navigate back to `http://app.recipes.docker.localhost` — API calls should now succeed (forward_auth passes).
5. **HMR works**: Edit a recipes client file, confirm the browser updates without full reload.
6. **Links work**: Click a link in the recipes app that navigates to another recipes subdomain (e.g. account). Confirm the URL is `account.recipes.docker.localhost`, not `account.docker.localhost`.

---

### Phase 5: Generalize to other products

Once recipes dev works under the hub model, replicate for notebook and hub.

**Step 5.1: Notebook dev environment**

Same changes as Phase 4 but for notebook: env vars, client build structure, Caddyfile, docker-compose. The monolith runs `startHubIdentityService()` + `startNotebookService()`.

**Test**: Same test checklist as Phase 4 step 5, but for notebook subdomains.

**Step 5.2: Hub dev environment**

Hub's dev environment runs all product services in its monolith. Its clients run on vite. All other products' clients are static.

- Hub monolith `run.ts`: `startHubIdentityService()`, `startHubService()`, `startRecipesService()`, `startNotebookService()`.
- Caddy serves static builds of recipes and notebook clients, proxies hub client subdomains to vite.
- Caddy config includes routes for all products' API subdomains.

**Test**: `npm run dev` in `hub/dev/`. Verify:

1. Hub app loads with vite HMR at `app.docker.localhost`.
2. Auth works at `auth.docker.localhost`.
3. Recipes static pages load at `recipes.docker.localhost` and `app.recipes.docker.localhost`.
4. Notebook static pages load at `notebook.docker.localhost` and `app.notebook.docker.localhost`.
5. All API endpoints respond (identity, hub, recipes, notebook).
6. Session persists across products: log in at `auth.docker.localhost`, then visit `app.recipes.docker.localhost` — should be authenticated.

---

### Phase 6: Production deploy

Update the deploy configuration to use the hub monolith and merged caddy config.

**Step 6.1: Update deploy docker-compose**

- Replace `recipes-monolith`, `notebook-monolith`, `hub-monolith` with a single `monolith` service using the hub monolith image.
- Update env files: single DOMAIN, merged CLIENT_SUBDOMAINS, all service HTTP host vars pointing to `monolith:*`.
- One set of identity data volumes instead of three.

**Step 6.2: Update deploy Caddyfile**

Merge per-product Caddyfiles into the hub domain model. All `forward_auth` points to one identity service. API subdomains use `api.{product}` prefix.

**Step 6.3: Update `Dockerfile.prod`**

Still multi-stage: build each product's clients, copy all into the caddy image. The env vars used during build (DOMAIN, CLIENT_SUBDOMAINS) now reflect the hub domain model.

**Test**: Run deploy locally with `docker-compose.prod-local.yaml`:

1. All product pages load (static builds for all clients).
2. Auth flow works: register at `auth.{domain}`, session persists across all products.
3. API health endpoints all respond.
4. Playwright tests pass (update `playwright.config.ts` files for new DOMAIN and SERVICE_SUBDOMAINS).

---

### Phase 7: Cleanup and documentation

**Step 7.1: Update `saflib/monorepo/docs/01-overview.md`**

Reflect the hub model: shared identity, single domain, service/monolith separation, dev environment structure.

**Step 7.2: Remove dead code**

- Per-product identity packages (if not already removed in Phase 3).
- Per-product auth SPA packages (recipes/clients/auth, notebook/clients/auth) — auth is now hub-only.
- Old env files and Caddyfiles.

**Step 7.3: Update playwright configs**

Each product's `playwright.config.ts` needs updated DOMAIN and SERVICE_SUBDOMAINS:

```typescript
process.env.DOMAIN = "docker.localhost";
process.env.SERVICE_SUBDOMAINS = "identity,api.recipes";
```

**Test**: Full playwright suite for each product.
