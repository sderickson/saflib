# Hub system setup and architecture
_Exported on 2/19/2026 at 11:32:19 PST from Cursor (2.4.37)_

---

**User**

Hey, I'm trying to come up with a plan for setting up a hub system for my applications. I've generated three applications: @recipes , @notebook , and @hub . Right now these are all completely independent! Well, they have a shared @deploy where they all get deployed to the same remote instance, though on different "monolith" containers. But they all have their own development setups too (see "dev" folders in any of the three apps).

Noting that a "service" is a large generic term for an independent .... service e.g. a product service, identity service, payment service, LLM service, etc, and includes frontend, backend, db, background processing and whatnot... I want to modify this is into a hub system with the following properties:

* In deployment, they all share the same identity service. The "recipes" and "notebook" applications route to hub's auth flow, and hub redirects them back based on what application sent them (or to hub's logged in experience otherwise).
* In development... I'd want the target app to be running vite, and the hub app to be running the static, prod build. No reason to have vite running for the hub when you're very unlikely to make changes there. The hub dev setup though, should be the opposite: hub in dev vite, every other product with the static build. That way it follows that the main target of development is running with hmr and all that jazz, and only what is necessary is running in a static fashion. Granted, the backend needs all required live services running, e.g. hub, identity and recipes services for recipes development.
* I'd generally like to keep node instances to a minimum. I've already sort of done that by having there be "monolith" packages for each product, where both the identity and the product express apps run in the same node process. Even though they're logically separated, and even communicate with each other over grpc, they're running together for resource sharing (and it's easy to split them out if they ever get too much altogther). So in development for example, it'd be great if the hub, product, and identity express servers (and grpc servers, cron jobs, etc) all run together in one monolith. I *think* I've sufficiently namespaced env variables, e.g. @notebook/service/common/env.ts  , to make this work. e.g. client subdomains would include in this scenario ",app,auth,recipes,app.recipes,notebook,app.notebook" along with all the admin and account variants. And the domain would be (in this case) scotterickson.info. I imagine the docker compose container for the node instance would be "monolith" and so each service would just need a distinct port for their http host, e.g. monolith:3000 might be the identity express server, monolith:3001 would be the hub express server, monolith:3002 would be recipes, monolith:3003 would be notebook... etc.
* I've got what I think is a good package to use for composing services - service packages! e.g. @notebook-service . It exports a function which does all the work of setting up whatever backend stuff that service needs (grpc, http, cron, etc). And doesn't include any identity service because that's separate. However! I also have @monolith which *does* include the identity service... but I also simplified the monolith to have all the logic of the service package so things aren't needlessly broken down. But maybe things do need to be broken down into monoliths and services now for the hub to work... because monolith for each product could represent the way I've described the backend running for development of that product, and service could be how each product composes the services it needs for its monolith...

Anywhoo! I think I've gotten all my thoughts out now. I kind of just want you to take a look, get your thoughts on if all this makes sense or if there's any changes you'd make. Check out also @saflib/monorepo/docs/01-overview.md for how things are generally structured. Clearly after these changes that doc will need updating but it gives you a sense of where I'm starting from.

---

**Cursor**

Let me explore the codebase to understand the current structure before giving you my thoughts.

Let me look at a few more specific files to round out my understanding.

Let me check a few more things - the product-specific Caddyfiles and how hub's identity service works.

Alright, I've done a thorough review. Here's my assessment.

---

## Overall Verdict: The Plan is Sound

Your codebase is actually *really well-structured* for this transition. The key architectural decisions you've already made - namespaced env vars, composable `start*Service()` functions, port-per-service convention, and the clean service/monolith separation - mean this is mostly a composition and routing problem rather than a deep refactoring.

Let me walk through each aspect of your plan with specific feedback.

---

## 1. Shared Identity Service - This is the Big One

**Current state**: Three independent identity instances, three separate SQLite databases, three sets of identical callbacks. Each product's Caddy config points `forward_auth` at its own identity service:

```8:8:deploy/remote-assets/config/recipes.Caddyfile
	import api-proxy {$RECIPES_IDENTITY_SERVICE_HTTP_HOST} {args[0]}
```

**Your plan**: Single identity under hub, other products redirect to hub's auth flow.

This makes perfect sense. A few things to think through:

**Cookie domain**: Your idea of one domain (`scotterickson.info`) with nested subdomains like `app.recipes.scotterickson.info` is the right call. Session cookies set on `.scotterickson.info` will cover all subdomains. This avoids the cross-domain auth nightmare entirely. If you went with separate domains per product, you'd need token exchange or some other cross-domain session mechanism.

**Identity callbacks consolidation**: Right now hub and recipes have *identical* callbacks files. With a shared identity service, you'd have one set of callbacks living in hub's identity package. Product-specific `{product}/service/identity/` packages would be eliminated. The hub identity service becomes *the* identity service.

**Auth redirect flow**: This is new logic you'd need to build. When Caddy's `forward_auth` returns a 401 for `app.recipes.scotterickson.info`, the client needs to redirect to `auth.scotterickson.info` with a `?redirect=app.recipes.scotterickson.info` parameter (or similar). After successful auth, hub redirects back. The identity HTTP server would need awareness of valid redirect targets to prevent open redirects.

**Product-specific auth SPAs go away**: Recipes and notebook currently each have their own `auth/` SPA. With shared auth, those become unnecessary - `auth.scotterickson.info` is the only auth UI. You'd probably still want `auth.recipes.scotterickson.info` to redirect to `auth.scotterickson.info` for backwards compatibility / good UX, or just not define that subdomain at all.

---

## 2. Dev Environment: Vite Target + Static Everything Else

Your plan is clean: the thing you're developing gets vite HMR, everything else runs the production static build, and the backend monolith runs all services.

**Docker compose for recipes dev would look roughly like:**
- `caddy` - routes all subdomains (hub, recipes, notebook)
- `recipes-clients` - vite dev server (port 5173), volume mounts for HMR
- `hub-clients` - static file server (nginx/caddy serving the build output)
- `notebook-clients` - static file server
- `monolith` - single node process: identity + hub-service + recipes-service + notebook-service
- `azurite`

**For hub dev, swap**: hub-clients gets vite, recipes/notebook get static builds.

This means each `{product}/dev/docker-compose.yaml` looks similar but with different client configurations. The monolith service definition would be identical across all three. You could potentially factor out a shared compose fragment or use Docker Compose `extends`/`include`.

---

## 3. One Monolith to Rule Them All - This is Where it Gets Interesting

Your instinct about the service/monolith split is exactly right. Here's how I'd think about it:

**Service packages stay as-is.** They're already perfect composable units:

```8:13:recipes/service/monolith/index.ts
export function startRecipesService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up recipes service...");
    log.info("Connecting to recipes-db...");
    const dbKey = recipesDb.connect({ onDisk: true });
```

Each one connects its DB, creates its Express app, listens on its configured port. No identity awareness. Clean.

**The monolith package is where composition happens.** Right now, `recipes/service/monolith/run.ts` does:

```1:16:hub/service/monolith/run.ts
import { startHubService } from "./index.ts";
// ... telemetry setup ...
startHubIdentityService();
startHubService();
```

For the hub system, I'd suggest the following structure:

- **Keep `{product}/service/{product}-service/`** as the composable service package (exports `start*Service()`). Actually, looking at the code, the monolith's `index.ts` already IS this function - it's duplicated between monolith and the service package. So you might just consolidate: the service package exports the start function, and monolith imports it.

- **Rethink what "monolith" means.** You have two distinct use cases:
  1. **Dev monolith** (per-product): identity + hub + all product services. Lives in `{product}/dev/` or `{product}/service/monolith/`. Each product's monolith is identical on the backend side - the only difference between "recipes dev" and "notebook dev" is which clients get vite.
  2. **Production monolith**: Same thing actually - identity + hub + all products. Lives in `deploy/`.

  Since the backend monolith is the same regardless of which product you're developing, you could have just **one** monolith package (maybe at the repo root or under `hub/service/monolith/`) that does:

  ```typescript
  startHubIdentityService();  // THE identity service
  startHubService();          // port 3001
  startRecipesService();      // port 3002
  startNotebookService();     // port 3003
  ```

  The Dockerfile for this monolith would need to copy all three products' service code, which is a bigger image but keeps things simple.

- **Or, keep per-product monoliths for flexibility.** If you ever want to deploy products independently (separate infra for different clients), per-product monoliths make sense. The recipes monolith would be: identity + hub-service + recipes-service (no notebook). But this means more Docker images and more complexity.

**My recommendation**: Start with a single "uber-monolith." You're already deploying to one remote instance. The dev environments only differ in client configuration. One monolith package, one Docker image for the backend. You can always split later.

---

## 4. Env Var Namespacing - Already Good, Needs a Few Tweaks

Your namespacing is solid. Looking at the current recipes env:

```1:33:recipes/dev/env.dev
# @saflib/env
ALLOW_DB_CREATION=true
DEPLOYMENT_NAME=development
// ...
RECIPES_DOMAIN=recipes.docker.localhost
DOMAIN=${RECIPES_DOMAIN}
// ...
RECIPES_IDENTITY_SERVICE_HTTP_HOST=recipes-monolith:3000
IDENTITY_SERVICE_HTTP_HOST=${RECIPES_IDENTITY_SERVICE_HTTP_HOST}
// ...
RECIPES_SERVICE_HTTP_HOST=recipes-monolith:3001
```

With the hub system, the env file for dev would look something like:

```
DOMAIN=scotterickson.docker.localhost
CLIENT_SUBDOMAINS=,app,auth,recipes,app.recipes,notebook,app.notebook,admin,account
SERVICE_SUBDOMAINS=identity,hub,recipes,notebook

IDENTITY_SERVICE_HTTP_HOST=monolith:3000
HUB_SERVICE_HTTP_HOST=monolith:3001
RECIPES_SERVICE_HTTP_HOST=monolith:3002
NOTEBOOK_SERVICE_HTTP_HOST=monolith:3003
```

The current pattern where `DOMAIN=${RECIPES_DOMAIN}` aliases a namespaced var to the generic one works well. With the hub, `DOMAIN` just becomes the hub's domain directly.

**One thing to watch**: The current `@saflib/env` inherited vars include `DOMAIN`, `CLIENT_SUBDOMAINS`, etc. in each service's common env schema. With a shared monolith, these would all need to agree on the same domain. Currently they're set per-product. You'd need to make sure the env validation in each service's schema is compatible with the hub domain structure (e.g., `DOMAIN=scotterickson.info` needs to work for all services, not just the one that "owns" that domain).

---

## 5. Caddy Routing in the Hub World

The current per-product Caddyfiles are elegant. In the hub system, you'd likely merge them or restructure:

- `auth.scotterickson.info` → hub identity auth routes (the only auth endpoint)
- `app.scotterickson.info` → hub app SPA
- `scotterickson.info` → hub root SPA
- `recipes.scotterickson.info` → recipes root SPA
- `app.recipes.scotterickson.info` → recipes app SPA
- `notebook.scotterickson.info` → notebook root SPA
- `app.notebook.scotterickson.info` → notebook app SPA
- `hub.scotterickson.info` → hub API proxy (forward_auth to identity)
- `recipes.scotterickson.info/api/` or `api.recipes.scotterickson.info` → recipes API proxy
- `identity.scotterickson.info` → identity service

All `forward_auth` directives point to the single `IDENTITY_SERVICE_HTTP_HOST`. No more per-product identity hosts.

---

## 6. Things I'd Flag as Potential Gotchas

1. **Session storage**: Right now each identity instance uses its own SQLite file. With one identity service, there's one session store. Make sure the session cookie's domain is set to `.scotterickson.info` (note the leading dot) so it covers all subdomains including nested ones like `app.recipes.scotterickson.info`.

2. **gRPC between services**: Currently each monolith has its own identity gRPC server (port 50051). If everything's in one process, you might not even need gRPC for identity - you could call identity functions directly in-process. But keeping gRPC maintains the logical separation and makes it easier to split later.

3. **The `links` packages**: Each product has a `links/` client package that generates URLs. These would need to understand the new subdomain structure. For example, recipes links currently generate `auth.recipes.docker.localhost` URLs; they'd need to generate `auth.scotterickson.docker.localhost` for auth and `app.recipes.scotterickson.docker.localhost` for app pages.

4. **Docker image size**: A single monolith image that includes all three products' service code + all three products' client builds (for the static-served ones) will be larger. Not a dealbreaker, but something to be aware of for your 256M memory-limited containers.

5. **Database files**: You currently have separate DB data directories per product (`/opt/recipes/db`, `/opt/notebook/db`, etc.). This stays the same - each product still has its own database. But identity consolidates to one: `/opt/hub/identity`.

---

## Summary of What I'd Recommend

1. **Service packages** (`{product}/service/{product}-service/`): Keep exactly as-is. They're already perfectly composable.

2. **Identity**: Consolidate to hub's identity. Remove `recipes/service/identity/` and `notebook/service/identity/` packages. All auth goes through hub.

3. **Single monolith package**: Create one monolith (probably under `hub/service/monolith/` or a new top-level location) that composes identity + hub + recipes + notebook services. Use this for both dev and production.

4. **Dev environments**: Each `{product}/dev/` docker-compose becomes: one monolith container, one vite client container (for the target product), static client containers for the other products, caddy, azurite.

5. **One domain**: `scotterickson.info` with nested subdomains. Cookie domain set at the root. Single `CLIENT_SUBDOMAINS` that includes everything.

6. **Caddy**: Merge or restructure Caddyfiles. All `forward_auth` points to one identity service.

The existing architecture has clearly been designed with composition in mind - the transition is very feasible. The hardest parts will be the auth redirect flow (new feature), the cookie/session domain configuration, and updating all the `links` packages for the new URL structure.

---

**User**

Great! Following up on a few nits...
> hub-clients - static file server (nginx/caddy serving the build output)
> notebook-clients - static file server
I think in development, let's just have one caddy instance with whatever static builds are necessary. Maybe to be clear "clients" does become "recipes-clients" to go along with "recipes-monolith" but the hub static could would just be part of the existing "caddy" service. And for the hub, the only difference is caddy has static builds of *all* the other clients, but there's still a "hub-clients" vite server going.

>  The monolith service definition would be identical across all three. 
I do think I'd prefer to do the slightly more optimal thing and only run the services necessary for that product. I don't need the recipes backend running if I'm developing the notebook. It won't matter *too* much at first but I expect there'll be enough products added soon enough that it warrants that optimization now to keep development streamlined!

Also, in a way it's less work to maintain one monolith for each product, rather than refactor to a single hub monolith.

Re service/monolith, yeah you did notice that monolith right now is acting both as service definition and monolith. I collapsed them in the prior model because that bifurcation was unnecessary. I think cleanly separating them again will be necessary now.

Re env var namespacing, so... domain here could be a little complicated. Thinking from the perspective of the *client frontend*, the domain is recipes.scotterickson.info for the recipes frontend, the domain is notebook.scotterickson.info for the notebook frontend, and scotterickson.info is the domain for the hub frontend. All the links packages stitch together their subdomain (app, auth, root, etc) to whatever the common domain is for those set of SPAs. I'm reviewing all instances of ".DOMAIN" I can find in the codebase and I think there are two parts where it *might* get tricky: @saflib/vite/vite.config.ts:12-13 redirection in development, because the redirects to the right index.html file needs to happen, and @saflib/links/utils.ts:35-36 generating links in the backend, where having "scotterickson.info" for the domain and "app" for a link is not enough information, but that's the info provided to get either the link to an app page for either recipes or notebook or hub. Maybe each client link needs to have their "subdomain" include the product segment... my intuition is it's *not* necessary or prudent to namespace domain into multiple env variables, but something to be aware of.

Oh... yeah actually caddy routing brings up something I hadn't considered, which is recipes.scotterickson.info either being the api or the site. I think I'd rather have it be the site, but then where's api? Hum, yeah let's go with "api.recipes" for the subdomain there, I much prefer that over mixing api and client servers on the same subdomain.

I'll keep the grpc stuff. If nothing else it helps me make sure the way I've got it set up works. When/if it becomes a bottleneck I'll address it but for now I really like the enforced logical separation.

I'm giving you write access. Can you take what I've written and what you've written and merge it into a spec in @notes ? Let's say in a dir named 2026-02-19-hub-repo.

---

**Cursor**

Let me check the notes directory structure and an existing spec for formatting reference.

Now let me read a couple more files to make sure I capture the right details for the spec - specifically around the identity session handling and the links types.

---

**User**

I meant in saflib/notes, because this is relevant to the stack, not specifically this repo

---

**Cursor**

Good call. Let me also grab the recipes links to make sure the spec captures the subdomain pattern correctly.

Now let me remove the incorrectly created directory and create it in the right place.

Written to `saflib/notes/2026-02-19-hub-repo/spec.md`. The spec covers:

- **Domain/subdomain layout** with the `api.{product}` prefix decision and the full subdomain table
- **DOMAIN env var** analysis - why a single value works, plus the links/vite implications with nested subdomains
- **Shared identity** consolidation, session cookies (already correctly scoped), and the auth redirect flow
- **Service/monolith separation** - service packages as composable units, per-product monoliths that only run what's needed (e.g. recipes monolith runs identity + hub + recipes, not notebook)
- **Dev environment** docker-compose structure - one caddy serving static builds for non-target products, one vite container for the target, one monolith
- **Caddy routing** examples for the merged single-domain model
- **Migration steps** in a rough dependency order
- **Open questions** for things that still need decisions

Let me know if you want to adjust anything - tone it down, expand certain sections, or resolve any of the open questions.

---

**User**

@saflib/notes/2026-02-19-hub-repo/spec.md:151-168 - I'd like to simplify this. Let's just have the hub monolith *include* all the product services. Then in development you can actually test the hub with all the various products running, *and* you can reuse the hub monolith as the production monolith. One fewer packages to manage, and development is that much closer to production.

@saflib/notes/2026-02-19-hub-repo/spec.md:231 I don't think the way caddy is setup now needs to change. Each dev container will have a caddy config which makes explicit what domains there are and what env variables are required, and the deploy folder also has its own. Each way you run things has its own specific caddy setup.

I also answered your open questions.

Also, curious your thoughts on my most latest adjustments and the ones from before that you already incorporated. Any risks or other possible changes I should consider?

---

**Cursor**

Let me read the current state of the file to see if you made edits to the open questions.

Great, I can see your answers. Let me make all three updates.

Let me re-read the exact content around those lines.

Now update the caddy section.

Now update the open questions with your answers and update the goals to reflect the hub monolith = production monolith simplification.

Now update the open questions to reflect your answers and remove the "open" framing.

Also update the deploy migration step to reflect the simplified topology.

Good, all three updates are in. Now for your question about risks and considerations — here are my thoughts on the latest adjustments plus what was already incorporated:

**Hub monolith = production monolith: clean win, one subtle thing to watch.** The hub monolith Dockerfile needs to copy service code for *all* products, so it becomes the "heaviest" image. The per-product monolith Dockerfiles (recipes, notebook) only need their own service code plus hub's. Not a problem, just a thing to keep in mind as you add products — the hub monolith image will always be the superset. If you're doing CI builds, you might want to build hub's monolith image last since it has the most dependencies.

**Explicit per-environment caddy configs: good, one risk.** The risk is config drift — if you add a new shared snippet or fix a routing bug, you need to update it in each dev environment's Caddyfile and in deploy's. But since these are all in the same repo and likely touched together during product changes, this is manageable. You could still share a `common.Caddyfile` with snippets (like `api-proxy`, `identity`, `spa`) and import it from each environment's config. That's already your pattern in deploy today.

**Per-product monoliths with only needed services: correct tradeoff.** One thing to be aware of: the recipes monolith still needs `startHubService()` because the auth redirect flow hits the hub API. If any future cross-product feature requires product B's API while developing product A, you'd need to add it to that monolith too. But that's straightforward and you'd discover it immediately during dev.

**`api.recipes.*` subdomains: check TLS cert coverage.** Wildcard certs (`*.scotterickson.info`) only cover one level of subdomain. `api.recipes.scotterickson.info` is three levels deep, so you'd need either a `*.recipes.scotterickson.info` wildcard too, or rely on Caddy's automatic per-domain ACME certificates (which Caddy handles well out of the box). In dev with HTTP this isn't relevant, just something for production.

**Link subdomains with product prefix (`"app.recipes"`):** This is the area I'd be most careful with. The `setClientName("app.recipes")` call and `getHost()` stripping logic looks like it should work, but there are a few places to double-check:
- `setClientName` validates that `document.location.hostname.startsWith(client + ".")` — `"app.recipes.scotterickson.info".startsWith("app.recipes.")` is true, so that's fine.
- `getHost()` does `host.replace(clientName, "")` — `"app.recipes.scotterickson.info".replace("app.recipes", "")` yields `".scotterickson.info"`, and the leading dot is stripped. Good.
- The playwright configs and test setups may need updating since they reference domains.

**One thing I haven't seen discussed: database migration.** If there are existing users in the separate per-product identity SQLite databases, they'd need to be merged into hub's single identity database. If these are all dev/personal databases that can be wiped, this is a non-issue. But if there's production data, that's a migration step to plan.

---

**User**

> Per-product monoliths with only needed services: correct tradeoff. One thing to be aware of: the recipes monolith still needs startHubService() because the auth redirect flow hits the hub API.

I'm not sure I follow? Actually there's no redirecting to speak of currently... there are just links in the frontend, and any auto redirecting I'd expect to happen in the client after it tries to get the profile and gets a 401. As near as I can tell there's.... nothing involved in this initial implementation that needs a hub api endpoint of any kind. There certainly might be one added, but that would be hub-specific I'd expect and not necessary.

---

**Cursor**

You're absolutely right, I was conflating the hub *product* API with the identity/auth layer. The auth flow is entirely between:

1. The auth SPA (a static frontend served by caddy at `auth.scotterickson.info`)
2. The identity service endpoints at `identity.scotterickson.info`

The hub HTTP service (`startHubService()`) is the hub's own *product* backend — whatever hub-specific features it has. It plays no role in authentication. The recipes monolith just needs identity + recipes.

Let me fix the spec.

Done. The per-product monoliths now only compose identity + their own service. The hub product API is only needed in the hub monolith (which is also the production monolith). The auth SPA and identity service handle the entire auth flow independently — no hub backend involvement.

---

**User**

great! Now I'm looking at the plan in detail... so the way I'd like this to work (as much as possible) is to make changes stepwise such that I can test it and see if it works. Maybe can you update the plan to articulate things to test? Like running a dev environment and checking auth works... I know a bunch of this stuff all needs to happen together to enable testing anything... some might be unit-testable like the links utils in step two... yeah see if you can structure the plan with explicit tests along the way so we're not trying out and debugging everything at once.

---

**Cursor**

Let me re-read the current migration steps and think about what can be tested incrementally.

Now let me also look at the existing test infrastructure to understand what's already testable.

Now let me look at the current deploy Dockerfile.prod to understand the static build pattern.

Good, now I have a clear picture of the full chain. Let me rewrite the migration steps with explicit test checkpoints.

Let me verify the final file looks right.

The migration steps are now structured into 7 phases with explicit test checkpoints. The key design principle is **test the smallest thing you can at each step**:

- **Phase 1** is a pure refactor — tests pass identically, nothing changes at runtime.
- **Phase 2** is unit-testable in isolation — write the link tests first, confirm nested subdomains already work, then update the string constants.
- **Phase 3** is a backend-only swap — since the identity packages are identical wrappers, you can swap one for another and verify the existing dev environments still work with no other changes.
- **Phase 4** is the big integration test — this is where everything comes together for one product. The test checklist is explicit: health checks, static pages, vite HMR, auth flow, links.
- **Phases 5-7** are replication and cleanup — you've already proven the pattern works, now you're applying it to the remaining products.

The ordering also tries to keep you on working ground as long as possible. Phases 1-3 don't change the domain model at all — each product still runs independently on its own domain. Phase 4 is where you make the jump, but only for one product.

---

**User**

cool! These will make nice commits too. I refactored your plan into a separate @saflib/notes/2026-02-19-hub-repo/plan.md doc, it seemed about time.

Now one last question I think... what models should I use for each step? I was thinking of trying cursor composer since it's cheaper and all the tough stuff has been thought out. But also this is a pretty non-trivial bit of work so maybe something like yourself (opus 4.6) would be warranted, at least for the big step 4? WDYT?

---

**Cursor**

Good question. Let me look at the plan to give a phase-by-phase recommendation.

Here's my take on model selection for each phase:

**Phase 1 (service/monolith separation)** — A faster model is fine here. The changes are mechanical: replace duplicated code with imports. The pattern is the same across all three products, the spec tells you exactly what to do, and the existing code is right there to reference. The main risk is getting the import paths and exports right, which is straightforward.

**Phase 2 (links + vite)** — Also fine for a faster model. Step 2.1 is writing unit tests with exact expected inputs/outputs spelled out in the plan. Step 2.2 is changing string constants. Step 2.3 is code reading, not even editing. Very mechanical.

**Phase 3 (identity consolidation)** — Still straightforward for a faster model. Swap one import for another, update a `package.json` dependency, delete some directories. The plan is explicit.

**Phase 4 (single-domain dev environment)** — This is where I'd use a more capable model. This phase is the one where:
- Multiple systems interact (docker-compose, caddy, vite, env vars, monolith composition, client build structure) and a mistake in one can manifest as a confusing error in another.
- The Caddyfile needs to be written from scratch for a novel routing setup. Caddy config syntax is finicky and the interaction between `forward_auth`, reverse proxy, and static file serving has subtleties.
- The docker-compose needs to coordinate image builds, volume mounts, env files, and multi-stage Dockerfiles in a way that hasn't been done before in this repo.
- Debugging is iterative — when `npm run dev` doesn't work, the model needs to reason about which layer is failing (DNS? caddy routing? vite? monolith env? cookie domain?) and that benefits from deeper reasoning.

I'd probably break Phase 4 into individual conversations per step (4.1 through 4.5) even with a capable model, since each step produces artifacts the next depends on, and you want to test between them. The testing step in particular benefits from you driving — you know what "working" looks like better than any model.

**Phase 5 (generalize)** — Could go either way. Step 5.1 (notebook) is applying an established pattern from Phase 4, so a faster model with good context (point it at the recipes dev setup you just built) should handle it. Step 5.2 (hub) is slightly different since it's the uber-monolith with all products, but still follows the same pattern. I'd probably try a faster model here and escalate if it struggles.

**Phase 6 (deploy)** — Similar complexity to Phase 4 but less novel since you've already built the pattern in dev. A capable model is probably worth it for the Caddyfile merge and docker-compose restructuring, but it's less risky than Phase 4 because you have working reference configs from the dev environments.

**Phase 7 (cleanup)** — Faster model. It's deleting files, updating docs, and changing config strings.

**TL;DR**: Use a faster/cheaper model for Phases 1, 2, 3, 5, and 7. Use something like Opus for Phase 4 (and maybe 6). Phase 4 is the crux — it's where the novel architecture actually gets wired together for the first time, and where debugging will require cross-cutting reasoning across multiple config systems.

