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
- `remote-assets/docker-compose.prod.yaml`: the production stack. Its `$CONTAINER_REGISTRY/<image>` services decide **which images are built and pushed**; there are no image lists to maintain.

## Commands

| Command       | npm script (convention) | What it does                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`       | `build`                 | `saf-docker build` of the images the prod compose file runs (and their upstream builds), for `linux/amd64` by default (`--platform native` for prod-local on a Mac). Unchanged images are skipped; registry copies are reused. Local images also get `$CONTAINER_REGISTRY/…` tags. |
| `push`        | `push`                  | `build`, then push every tag; already-pushed images are only retagged.                                                                                                                                                                                                             |
| `status`      | `status`                | What `build` would do.                                                                                                                                                                                                                                                             |
| `sync`        | `sync`                  | Zip `remote-assets/`, upload it, unpack it with rsync (keeps bind-mount inodes).                                                                                                                                                                                                   |
| `pull`        | `remote-pull`           | On the server, pull the prod compose file's `$CONTAINER_REGISTRY` images.                                                                                                                                                                                                          |
| `up`          | `remote-deploy`         | `docker compose up -d --force-recreate --remove-orphans`, then prune, then `register-sites`.                                                                                                                                                                                       |
| `register-sites [--local]` | `prod-local` (with `--local`) | Copy `remote-assets/caddy/*.Caddyfile` (placeholders filled from the matching `.env`) into the edge and reload it. If the edge rejects them, this deploy's previous routes are restored. `--local` targets a prod-local edge on the local Docker. |
| `down`        | `remote-undeploy`       | `docker compose down`.                                                                                                                                                                                                                                                             |
| `logs`        | `remote-logs`           | Follow the stack's logs.                                                                                                                                                                                                                                                           |
| `setup`       | `remote-setup`          | Install Docker if missing; start it.                                                                                                                                                                                                                                               |
| `purge`       | `remote-purge`          | Uninstall Docker.                                                                                                                                                                                                                                                                  |
| `exec [file]` | `exec-remote`           | Run a script (file or stdin) on the server with `env.remote` exported.                                                                                                                                                                                                             |
| `release`     | `full-deploy`           | `push` → `sync` → `pull` → `up` (which registers routes).                                                                                                                                                                                                                                                   |

Remote commands pipe their script (bundled in this package under `remote-scripts/`) to `ssh $SSH_HOSTNAME 'bash -s'`, preceded by `sudo -i` (unless `REMOTE_SUDO=0`) and `export`s of every `env.remote` value.

## Adopting it in an existing product

1. Add `"@saflib/deploy-cli": "*"` to the deploy package's dependencies and replace its scripts with the conventional ones above (see saflib's `base/platform/package.json` or `base/product/deploy/package.json`).
2. Delete `deploy/local-scripts/` and `deploy/remote-scripts/`.
3. Make sure `env.remote` has the variables above, and that each production image is built by some build (see `@saflib/docker`): `saf-deploy status` lists what it found.
4. CI keeps calling `npm run build` / `npm run push` in the deploy workspace.
