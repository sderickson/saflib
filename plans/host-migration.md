# Host migration: move a product's whole stack to a new machine

> **Living document.** Whoever works on this (human or agent) keeps the
> **Status** section and **Decisions log** current as work lands. If you pick
> this up cold, read Status first, then Design, then the next unchecked phase.

## Status

- **Phase:** 6 (first product migration): saflib side done, product adopted
  on a branch, not yet run against a real host.
- **Last updated:** 2026-11-24
- **Next action:** run `saf-deploy migrate` steps 1–5 against the new host
  (rehearsal), then schedule the attended window.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | Deploy targets (`env.remote.<target>`) | done |
| 2 | Multi-arch images (per-arch builds + manifest) | done |
| 3 | Host setup: data mount check, daemon.json, userns-remap | done |
| 4 | `saf-deploy migrate` guided walkthrough + data copy | done |
| 5 | Non-root containers (image `USER`s, host-reading services) | done (product side, per target) |
| 6 | First product migration (adopt, rehearse, cut over) | in progress |

## Context

A SAF product runs on one Docker host: a platform deploy (edge Caddy, Kratos,
monitoring) and one or more product deploys that register routes with the
edge. Each deploy package has an `env.remote` naming the host
(`SSH_HOSTNAME`) and where its assets go. Persistent data lives on a separate
disk mounted at a fixed path (e.g. `/mnt/disks/<product>-prod-data`) that the
compose files bind-mount; the boot disk holds only the OS and Docker, and is
disposable.

Moving to a new machine comes up regularly: an interim Ubuntu release reaching
end of life (its archive stops publishing, so even security updates stop), a
machine-type change, a new architecture. Today that's a manual, error-prone
sequence done rarely enough to forget each time.

Things that make it harder than "point `SSH_HOSTNAME` somewhere else":

- **Architecture.** Images are built for one platform (`saf-deploy build`
  defaults to `linux/amd64`). A new arm64 host can't run them, and pushing
  arm64 images under the same tags breaks the old host on its next pull.
- **Side effects.** A full stack on the new host before cutover runs cron and
  jobs against an empty database (emails, outbound API calls, archive uploads
  to shared buckets) and its Caddy fails ACME, since DNS still points at the
  old host (and failed validations count against Let's Encrypt limits).
- **Several deploys, one host.** The platform deploy must be up before
  product deploys (they join its network); they go down in reverse.
- **Host state outside the deploys.** A few files live on the host, not in
  `remote-assets/` (e.g. alertmanager secrets under `/opt`).
- **Privilege.** Docker runs as root and most containers run as root inside
  (docker-bench-security: user namespaces; 4.1, a user for the container).
  Fixing that changes the ownership of every data file, which a migration
  that copies the data anyway is the cheapest moment to do.

Goals:

1. One command walks the operator through a standard migration, step by step,
   pressing Enter to continue: automating what it can, printing exact
   instructions for what it can't (creating the VM and disk, moving the IP).
2. Old and new hosts deploy side by side from the same checkout until cutover,
   even on different architectures.
3. Downtime is a short, attended window (minutes), with a rollback path at
   every step after the old host goes down.
4. The new host comes up hardened: automatic security updates, user-namespace
   remapping, non-root containers.

Non-goals: zero-downtime migration (needs replication or a read-only mode,
not worth it at this data size: a typical product's data disk is well under
1 GB), multi-host deploys, cloud-provider automation (VM creation and IP moves
stay manual, with printed `gcloud` hints).

## Design

### Deploy targets (phase 1)

`env.remote` stays the default target. A deploy can have more:
`env.remote.<target>` holds overrides layered on top (usually just
`SSH_HOSTNAME`, plus host-specific settings like `SAF_USERNS_REMAP=1`).
Select with `--target <name>` on any remote command or `SAF_DEPLOY_TARGET`
in the environment (`SAF_DEPLOY_TARGET=next npm run remote-setup`). The
selected target is printed before any remote command runs, so it's never a
surprise which host is being touched.

Cutover promotes a target: the old `env.remote` becomes
`env.remote.<old-name>` (overrides only, a full file is fine too) and the new
target's values merge into `env.remote`. `migrate` does this for every deploy.

### Multi-arch images (phase 2)

Each architecture is built natively where possible (CI: an x86 runner and an
arm runner) and pushed under its input tag only (`in-<hash>`; the platform is
already part of the hash). A separate step publishes the moving tags
(`latest`, `build.json` extra tags) as **manifest lists** pointing at each
architecture's input-tagged image:

    docker buildx imagetools create -t reg/img:latest \
      reg/img:in-<amd64-hash> reg/img:in-<arm64-hash>

Hosts keep pulling `reg/img:latest`, and Docker picks their architecture.
Compose files don't change.

- `saf-deploy build|push --platform amd64,arm64`: builds each platform in turn
  (one via emulation, on a single machine), then publishes manifests.
- `saf-deploy push --platform arm64 --no-manifest`: one architecture only, for
  a CI matrix job.
- `saf-deploy manifest --platform amd64,arm64`: computes each platform's input
  hash from the checkout (pure; no build), checks every input-tagged image
  exists in the registry, then publishes the manifest lists. The CI merge job.
- A single platform (`--platform arm64`) behaves as today: tags `latest`
  directly. So products not migrating are unaffected.
- The default platform comes from `SAF_DEPLOY_PLATFORMS` in `env.remote`
  (comma-separated; default `amd64`, today's behavior), so a product declares
  its architectures once.

### Host setup (phase 3)

`saf-deploy setup` already installs Docker and turns on unattended security
upgrades with nightly reboots when needed. It gains:

- **Data mount check.** With `SAF_DATA_DIR` set, refuse to continue unless it
  is a mount point (`findmnt`), so a missing disk can't silently put data on
  the boot disk.
- **daemon.json.** When `/etc/docker/daemon.json` doesn't exist, install a
  hardened default (`icc: false`, `live-restore`, `userland-proxy: false`,
  `no-new-privileges`, log rotation). An existing file is left alone, except:
- **userns-remap.** With `SAF_USERNS_REMAP=1`, ensure
  `"userns-remap": "default"` is set (merging into an existing file), then
  restart Docker. Opt-in per target, because turning it on hides every
  existing image, container and volume (Docker keeps them under a separate
  root), which on a running host means downtime and re-pulls. A fresh host
  pays nothing.

### `saf-deploy migrate` (phase 4)

Run from the monorepo root:

    saf-deploy migrate --deploys deploy,app/deploy --to next

`--deploys` lists every deploy package on the host, platform deploy first.
`--from` defaults to the default target. Each step prints what it does and
waits for Enter (or `s` to skip, `q` to quit); automated steps show their
commands as they run. Progress is saved in `.saf-deploy/migrate-<to>.json`,
so a rerun resumes where it stopped.

Steps:

1. **Create the machine** (manual). Printed checklist: Ubuntu LTS image (not
   an interim release), architecture matching `SAF_DEPLOY_PLATFORMS`, a
   separate data disk (with a snapshot schedule), HTTP/HTTPS firewall rules,
   the service account the product needs. No static IP yet: the old host's
   address moves over at cutover.
2. **SSH** (manual + check). Operator adds their key and enters
   `user@address`. The tool checks `ssh -o BatchMode=yes` works, then writes
   `env.remote.<to>` for each deploy (`SSH_HOSTNAME`, plus
   `SAF_USERNS_REMAP=1`), showing the diff first.
3. **Data disk** (manual + check). If `SAF_DATA_DIR` isn't a mount point on
   the new host, list unmounted block devices (`lsblk`) and print the
   format/mount/fstab commands for the operator to run (formatting is
   destructive, so the tool never runs it). Re-check until mounted.
4. **Setup** (automated): `setup` on the new host.
5. **Images** (check). For each deploy, confirm every image in the compose
   files has a manifest for the new host's architecture
   (`docker buildx imagetools inspect`), else say how to publish one.
6. **Stage** (automated): `sync` and `pull` for each deploy on the new host,
   and copy `SAF_MIGRATE_HOST_PATHS` (e.g. `/opt/alertmanager/secrets`) from
   old to new. Nothing is started.
7. **Begin the window** (confirm). Everything up to here is safe to do days
   ahead. From here, the product is down until step 11.
8. **Stop the old host** (automated): `down` for each deploy, in reverse.
9. **Copy data** (automated): stream `SAF_DATA_DIR` old → new through the
   operator's machine (`ssh old tar | ssh new tar`, numeric owners kept; no
   host-to-host keys needed), then compare a per-file checksum list from both
   sides. With userns-remap on the new host, shift every owner by the
   remapped base (from `/etc/subuid`'s `dockremap` entry) so each container
   sees the same uid it did before. `SAF_DATA_OWNERS` (e.g.
   `app=1000:1000 kratos=10000:10000`) then sets owners per top-level folder,
   for containers that changed to a non-root `USER` (phase 5).
10. **Move the address** (manual). Printed `gcloud` hints for moving a
    static external IP from one VM to another; the tool waits until
    `ssh <address>` reaches the new host (by comparing host keys or
    `/etc/machine-id`).
11. **Start the new host** (automated): `up` for each deploy, platform first.
    Then the operator checks the product (the tool prints
    `SAF_MIGRATE_CHECK_URL` results if set).
12. **Promote** (automated, confirm): swap `env.remote` ↔ `env.remote.<to>`
    in each deploy (the old one stays as `env.remote.<from-name>`).
13. **Afterwards** (checklist): keep the old VM stopped (not deleted) for a
    week as a rollback; confirm the new disk's snapshot schedule; delete the
    old VM and disk later.

**Rollback** from steps 8–11: move the address back if moved, `up` on the old
host. The old host's data is never modified. The tool prints this at each of
those steps.

Out of scope for the copy: Docker named volumes (Caddy certificates,
Prometheus history). Caddy re-issues certificates once the address points at
the new host; metrics history restarts. Persisting them would mean moving
them onto the data disk first.

### Non-root containers (phase 5)

With `userns-remap`, root in a container is an unprivileged uid on the host,
which covers most of the escape risk on its own. In addition:

- **Image users.** Product images get a `USER` (Node images: `node`, uid
  1000). Their bind-mounted data folders need that owner, which
  `SAF_DATA_OWNERS` sets during the migration copy (and a one-off `chown` on
  hosts that aren't migrating).
- **Host-reading services** (node-exporter, the host-apt sidecar) need the
  host's namespaces and get `userns_mode: host`. They're already read-only and
  capability-limited.
- Verify with prod-local (a userns-remapped Docker is not the default on a
  Mac, so this is mostly about image users and file ownership) and with
  docker-bench-security on the new host.

### First product migration (phase 6)

Product-side changes, in the product repo:

- `env.remote.next` in each deploy package.
- `SAF_DEPLOY_PLATFORMS=amd64,arm64` in `env.remote` until cutover, then
  `arm64` only.
- CI: per-arch build jobs (x86 + arm runners) and a manifest job.
- Compose: `userns_mode: host` on host-reading services; image `USER`s.
- `SAF_DATA_DIR`, `SAF_DATA_OWNERS`, `SAF_MIGRATE_HOST_PATHS` in `env.remote`.
- Rehearse steps 1–6 on the new host, then schedule an attended window.

## Decisions log

- **2026-11-24:** Copy data through the operator's machine instead of moving
  the disk. Data is small (well under 1 GB); the newest machine series (e.g.
  GCP's N4A/C4A) may only take Hyperdisk, so an older persistent disk may not
  attach anyway; and copying leaves the old disk untouched as a rollback.
- **2026-11-24:** Move the static IP rather than change DNS: no TTL wait, and
  ACME succeeds on first start.
- **2026-11-24:** Don't run the stack on the new host before cutover (cron,
  jobs and ACME side effects). Stage only: sync, pull, host files.
- **2026-11-24:** Manifest lists over per-arch tags, so compose files and the
  `pull` script stay architecture-agnostic.
- **2026-11-24:** userns-remap over rootless Docker. Rootless needs
  unprivileged ports 80/443 and breaks the host-reading monitoring
  containers; userns-remap gets most of the benefit.
- **2026-11-24:** userns-remap is opt-in per target. Turning it on for an
  existing host hides its images, containers and volumes.
- **2026-11-24:** A guided, resumable walkthrough rather than a one-shot
  script: migrations are rare, attended, and include manual cloud steps.
- **2026-11-24:** The app's container user is set per target in compose
  (`user: "${SAF_APP_USER:-0:0}"`), not baked into the image with `USER`.
  Existing hosts' data is root-owned, so an image `USER` would break them on
  their next deploy; the migration sets the new host's data owners
  (`SAF_DATA_OWNERS`) to match. Every container writing the same SQLite
  files must share that user.
- **2026-11-24:** Data copy goes through the operator's machine as two `ssh`
  processes piped together, and checks every file's sha256 on both sides
  before fixing owners. Ownership is fixed only right after a fresh extract
  (the step refuses a non-empty destination unless told to clear it), so a
  retry never shifts uids twice.
