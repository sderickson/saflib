# Overview

`@saflib/deploy-cli` provides `saf-deploy`, which builds, pushes and deploys a SAF product's production stack to a remote Docker host. Products no longer keep their own copies of build/push/sync/remote scripts; their deploy package just calls `saf-deploy` from `package.json` scripts, so fixes reach every product with a saflib update.

## Platform and product deploys

A repo has one **platform deploy** (`deploy/`, from `base/platform`) and one **deploy per product** (`<product>/deploy/`, from `base/product/deploy`), each with its own `env.remote` and server folder, so each product deploys on its own and could move to another host.

- The platform runs the **edge** Caddy (fixed `container_name`, e.g. `acme-edge`) and Kratos, on a named `edge` network. The edge holds no product files: it imports `/etc/caddy/sites/*.Caddyfile` from a volume.
- A product runs its monolith and a web container (its clients) on that network, and keeps its edge routes in `remote-assets/caddy/<product>.Caddyfile`. `saf-deploy up` registers them with the edge (see `register-sites`). Deploy the platform first.
- A route's `{$KEY}` placeholders are filled from `caddy/<product>.env` (or `<product>.prod-local.env` with `--local`), so the route carries the product's own domain and CSP. Keys it doesn't set are left for the edge's env. Values are literal.

## Conventions

Run `saf-deploy` from the product's **deploy package** (npm scripts do this). It expects:

- `env.remote`:
  - `SSH_HOSTNAME`: e.g. `root@example.com`
  - `CONTAINER_REGISTRY`: e.g. `ghcr.io/acme` (the environment's value wins, e.g. in CI)
  - `REMOTE_ZIP_PATH`: where the assets zip is uploaded
  - `REMOTE_ASSETS_FOLDER_PATH`: where `remote-assets/` is unpacked and compose runs
  - `REMOTE_SUDO` (optional): `0` to not `sudo -i` on the server. Privileged steps then use `sudo` when not root.
  - `SAF_EDGE_CONTAINER` (product deploys): the platform's edge container, which `remote-assets/caddy/*.Caddyfile` routes are registered with.
- `remote-assets/docker-compose.prod.yaml`: the production stack. Its `$CONTAINER_REGISTRY/<image>` services (and the blue-green file's) decide **which images are built and pushed**; there are no image lists to maintain.
- `remote-assets/docker-compose.blue-green.yaml` (optional, product deploys): services deployed blue-green; see below.

## Blue-green deploys

Services in a product's `docker-compose.blue-green.yaml` deploy with no downtime. They run as two compose projects, `<deploy>-blue` and `<deploy>-green` (`<deploy>` is the server folder's name), and only the live color gets traffic.

- Each service's container is named `<service>-${SAF_COLOR}` and has a healthcheck. Routes reach it by that name: `reverse_proxy recipes-web-{$SAF_COLOR}:80`, with `{$SAF_COLOR}` filled in at registration.
- `up` starts the idle color and waits for it to turn healthy (`SAF_HEALTH_TIMEOUT`, default 60s), else removes it and fails with the live color untouched. Then it brings up the rest of the stack, switches routes to the new color (`caddy reload`, so in-flight requests finish) and removes the old color.
- The live color is recorded on the server in `.saf-deploy/<deploy>/live` beside the assets folder (`sync` replaces the folder itself), and counts only while its containers run.
- The old color is stopped with SIGTERM and up to 30s (`SAF_STOP_TIMEOUT`) before removal. Services should run their process directly (not through `npm start`) and use `@saflib/node`'s `onShutdown`, as `@saflib/express`, the jobs runtime and cron do, so in-flight requests and jobs finish. Give such services `stop_grace_period: 30s`.
- Before removing the old color, `up` records the images it ran in `.saf-deploy/<deploy>/previous.yaml` (registry digests, so they still pull after `latest` moves). `rollback` runs those images again through the same health gate, leaving the rest of the stack alone; a successful rollback records the images it replaced, so you can roll forward the same way.
- Both colors share the product's data while they overlap, and the new one migrates its databases at startup, so migrations must work with the previous release's code (see `@saflib/drizzle`'s compatible migrations). Cron ticks are claimed in the database, so a tick runs once even when both colors fire it.
- `up --local` runs the same flow against the local Docker, beside a running prod-local stack (which runs blue), using `docker-compose.blue-green.prod-local.yaml` in the deploy package when there is one.
- Only for product deploys: the platform's edge and Kratos aren't duplicated.

## Release stamp

`sync` adds `release/release.json` to every upload: when the deploy ran, the HEAD commits of the deploying checkout (`-dirty` if uncommitted), and a hash of `remote-assets/`. Services mount `./release` at `/etc/saf/release` and record it on boot, so the ops API's deploy history includes config-only deploys. The local `remote-assets/release/` that prod-local creates is gitignored.

## Commands

| Command                    | npm script (convention)       | What it does                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`                    | `build`                       | `saf-docker build` of the images the prod compose file runs (and their upstream builds), for `linux/amd64` by default (`--platform native` for prod-local on a Mac). Unchanged images are skipped; registry copies are reused. Local images also get `$CONTAINER_REGISTRY/…` tags. |
| `push`                     | `push`                        | `build`, then push every tag; already-pushed images are only retagged.                                                                                                                                                                                                             |
| `status`                   | `status`                      | What `build` would do.                                                                                                                                                                                                                                                             |
| `sync`                     | `sync`                        | Zip `remote-assets/`, upload it, unpack it with rsync (keeps bind-mount inodes).                                                                                                                                                                                                   |
| `pull`                     | `remote-pull`                 | On the server, pull the prod (and blue-green) compose files' `$CONTAINER_REGISTRY` images.                                                                                                                                                                                         |
| `up [--local]`             | `remote-deploy`               | Blue-green services first (see above), then `docker compose up -d --force-recreate --remove-orphans` of the rest, `register-sites`, and prune. `--local` runs the blue-green part beside prod-local.                                                                               |
| `live [--local]`           |                               | Which blue-green color is live, and each color's containers.                                                                                                                                                                                                                       |
| `rollback [--local]`       |                               | Run the blue-green services' previous images again (recorded by the last successful `up`), health-gated like a deploy.                                                                                                                                                             |
| `register-sites [--local]` | `prod-local` (with `--local`) | Copy `remote-assets/caddy/*.Caddyfile` (placeholders filled from the matching `.env`) into the edge and reload it. If the edge rejects them, this deploy's previous routes are restored. `--local` targets a prod-local edge on the local Docker.                                  |
| `down`                     | `remote-undeploy`             | `docker compose down`, and both blue-green colors.                                                                                                                                                                                                                                 |
| `logs`                     | `remote-logs`                 | Follow the stack's logs.                                                                                                                                                                                                                                                           |
| `setup`                    | `remote-setup`                | Install Docker if missing; start it.                                                                                                                                                                                                                                               |
| `purge`                    | `remote-purge`                | Uninstall Docker.                                                                                                                                                                                                                                                                  |
| `exec [file]`              | `exec-remote`                 | Run a script (file or stdin) on the server with `env.remote` exported.                                                                                                                                                                                                             |
| `release`                  | `full-deploy`                 | `push` → `sync` → `pull` → `up` (which registers routes).                                                                                                                                                                                                                          |

Remote commands pipe their script (bundled in this package under `remote-scripts/`) to `ssh $SSH_HOSTNAME 'bash -s'`, preceded by `sudo -i` (unless `REMOTE_SUDO=0`) and `export`s of every `env.remote` value.

## Adopting it in an existing product

1. Add `"@saflib/deploy-cli": "*"` to the deploy package's dependencies and replace its scripts with the conventional ones above (see saflib's `base/platform/package.json` or `base/product/deploy/package.json`).
2. Delete `deploy/local-scripts/` and `deploy/remote-scripts/`.
3. Make sure `env.remote` has the variables above, and that each production image is built by some build (see `@saflib/docker`): `saf-deploy status` lists what it found.
4. CI keeps calling `npm run build` / `npm run push` in the deploy workspace.
