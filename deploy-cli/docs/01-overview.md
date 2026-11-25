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
  - `SAF_DEPLOY_PLATFORMS` (optional): platforms images are built for, comma-separated (default `amd64`); see **Multi-arch images**.
  - `SAF_DATA_DIR` (optional): where the host's data disk is mounted. `setup` refuses to continue unless it's a mount point.
  - `SAF_USERNS_REMAP` (optional): `1` to have `setup` turn on Docker user-namespace remapping. For new hosts: on a running host it hides existing images, containers and volumes.
- `env.remote.<target>` (optional): another host to deploy to, e.g. a new machine during a migration. Its values are layered over `env.remote` (usually just `SSH_HOSTNAME` and host settings). Select it with `--target <target>` or `SAF_DEPLOY_TARGET=<target>`; remote commands print the target and host first.
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

## Multi-arch images

A product whose hosts run different architectures (e.g. during a move from
amd64 to arm64) sets `SAF_DEPLOY_PLATFORMS=amd64,arm64` in `env.remote`.
Each platform is built in turn and pushed under its input tag only
(`in-<hash>`; the platform is part of the hash). Then `latest` and any
`build.json` tags become manifest lists of every platform's image, so each
host's `docker pull …:latest` gets its own architecture and compose files
don't change.

On one machine, `push` does both: the non-native platform builds under
emulation (slow). In CI, build each architecture natively on its own runner
with `push --platform <arch> --no-manifest`, then run `manifest` once both
jobs finish; it computes each platform's input hash from the checkout and
refuses to publish until every platform's image is in the registry.

Locally, `latest` follows the most recent platform built (native last), since
downstream Dockerfiles build `FROM <upstream>:latest`.

## Moving to a new machine

`saf-deploy migrate` walks through moving every deploy on a host to a new
machine, one step at a time (Enter to continue, `s` to skip, `q` to stop;
rerunning resumes). Run it from the monorepo root:

    saf-deploy migrate --deploys deploy,app/deploy --to next

1. **Create the machine** (manual checklist: LTS image, architecture, a separate
   data disk with snapshots, firewall, service account; then add your SSH key,
   and format and mount the data disk with an `/etc/fstab` entry).
2. **Connect**: checks SSH, then writes `env.remote.next` in each deploy.
3. **Check the data disk**: `SAF_DATA_DIR` must be mounted and in `/etc/fstab`;
   if not, lists the disks and prints the commands (it never formats anything).
4. **Set up**: `setup` on the new machine.
5. **Log in to the registry**: deploys run Docker as root, so root needs a
   registry login for private images (skip for public ones).
6. **Stage**: `sync` and `pull` for each deploy, copy `SAF_MIGRATE_HOST_PATHS`
   from the old machine, and check every service's CPU and memory limits fit
   the new machine. Nothing starts.
7. **Begin the window**.
8. **Stop the old stack**: `down` in each deploy, platform last.
9. **Copy the data**: streams `SAF_DATA_DIR` old → new through your machine,
   compares every file's checksum, then fixes owners for userns-remap and
   `SAF_DATA_OWNERS`.
10. **Move the static address** (manual, with `gcloud` hints): then checks the
    address presents the new machine's host keys, updates `known_hosts`, and
    points `env.remote.next` at it.
11. **Start the new stack**: `up` in each deploy, platform first, then checks
    every service is running (one-shot services may have exited cleanly).
12. **Check the product** (and `SAF_MIGRATE_CHECK_URL`, if set).
13. **Promote**: merge `env.remote.next` into `env.remote`, keeping the old
    values as `env.remote.previous`.
14. **Afterwards** (checklist).

Settings it reads (from the first deploy that has them):

- `SAF_DATA_DIR` (required): the data disk's mount point, the same on both machines.
- `SAF_DATA_OWNERS` (optional): `folder=uid:gid` pairs for top-level data folders whose container now runs as that user.
- `SAF_MIGRATE_HOST_PATHS` (optional): absolute host paths outside the deploys to copy (e.g. secrets under `/opt`).
- `SAF_MIGRATE_CHECK_URL` (optional): a URL that should answer once the new stack is up.

Docker named volumes (e.g. Caddy certificates, Prometheus history) aren't
copied: Caddy requests new certificates once the address moves.

## Release stamp

`sync` adds `release/release.json` to every upload: when the deploy ran, the HEAD commits of the deploying checkout (`-dirty` if uncommitted), and a hash of `remote-assets/`. Services mount `./release` at `/etc/saf/release` and record it on boot, so the ops API's deploy history includes config-only deploys. The local `remote-assets/release/` that prod-local creates is gitignored.

Before building, `build`, `push` and `release` warn when a submodule (e.g. saflib) is checked out at a different commit than the repo records, or isn't checked out: images are built from what's checked out, which after a branch switch without `git submodule update` isn't what's committed.

## Commands

| Command                    | npm script (convention)       | What it does                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`                    | `build`                       | `saf-docker build` of the images the prod compose file runs (and their upstream builds), for the platforms in `--platform`, else `SAF_DEPLOY_PLATFORMS` in `env.remote`, else `linux/amd64` (`--platform native` for prod-local on a Mac). Unchanged images are skipped; registry copies are reused. Local images also get `$CONTAINER_REGISTRY/…` tags.                                             |
| `push`                     | `push`                        | `build`, then push every tag; already-pushed images are only retagged. With several platforms (`amd64,arm64`), see **Multi-arch images**.                                                                                                                                                                                                                                                            |
| `manifest`                 |                               | Point `latest` (and `build.json` tags) at multi-arch manifest lists of each platform's pushed image; the step after per-platform `push --no-manifest` jobs.                                                                                                                                                                                                                                          |
| `status`                   | `status`                      | What `build` would do.                                                                                                                                                                                                                                                                                                                                                                               |
| `sync`                     | `sync`                        | Zip `remote-assets/`, upload it, unpack it with rsync (keeps bind-mount inodes).                                                                                                                                                                                                                                                                                                                     |
| `pull`                     | `remote-pull`                 | On the server, pull the prod (and blue-green) compose files' `$CONTAINER_REGISTRY` images.                                                                                                                                                                                                                                                                                                           |
| `up [--local]`             | `remote-deploy`               | Blue-green services first (see above), then `docker compose up -d --force-recreate --remove-orphans` of the rest, `register-sites`, and prune. `--local` runs the blue-green part beside prod-local.                                                                                                                                                                                                 |
| `live [--local]`           |                               | Which blue-green color is live, and each color's containers.                                                                                                                                                                                                                                                                                                                                         |
| `rollback [--local]`       |                               | Run the blue-green services' previous images again (recorded by the last successful `up`), health-gated like a deploy.                                                                                                                                                                                                                                                                               |
| `register-sites [--local]` | `prod-local` (with `--local`) | Copy `remote-assets/caddy/*.Caddyfile` (placeholders filled from the matching `.env`) into the edge and reload it. If the edge rejects them, this deploy's previous routes are restored. `--local` targets a prod-local edge on the local Docker.                                                                                                                                                    |
| `down`                     | `remote-undeploy`             | `docker compose down`, and both blue-green colors.                                                                                                                                                                                                                                                                                                                                                   |
| `logs`                     | `remote-logs`                 | Follow the stack's logs.                                                                                                                                                                                                                                                                                                                                                                             |
| `setup`                    | `remote-setup`                | Check `SAF_DATA_DIR` is a mount point (when set); install Docker if missing; install a hardened `/etc/docker/daemon.json` if there is none (with `SAF_USERNS_REMAP=1`, add `userns-remap`, also to an existing file); turn on unattended security upgrades and the apt timers, rebooting when an update needs it at 08:00 UTC (midnight to 1am Pacific). Docker's own packages aren't auto-upgraded. |
| `purge`                    | `remote-purge`                | Uninstall Docker.                                                                                                                                                                                                                                                                                                                                                                                    |
| `exec [file]`              | `exec-remote`                 | Run a script (file or stdin) on the server with `env.remote` exported.                                                                                                                                                                                                                                                                                                                               |
| `release`                  | `full-deploy`                 | `push` → `sync` → `pull` → `up` (which registers routes).                                                                                                                                                                                                                                                                                                                                            |

Remote commands pipe their script (bundled in this package under `remote-scripts/`) to `ssh $SSH_HOSTNAME 'bash -s'`, preceded by `sudo -i` (unless `REMOTE_SUDO=0`) and `export`s of every `env.remote` value.

## Adopting it in an existing product

1. Add `"@saflib/deploy-cli": "*"` to the deploy package's dependencies and replace its scripts with the conventional ones above (see saflib's `base/platform/package.json` or `base/product/deploy/package.json`).
2. Delete `deploy/local-scripts/` and `deploy/remote-scripts/`.
3. Make sure `env.remote` has the variables above, and that each production image is built by some build (see `@saflib/docker`): `saf-deploy status` lists what it found.
4. CI keeps calling `npm run build` / `npm run push` in the deploy workspace.
