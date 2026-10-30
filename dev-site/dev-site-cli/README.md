# `@saflib/dev-site-cli` (`saf-dev-site`)

CLI for product `dev/` folders: writes gitignored compose env files (including
agent credentials) and runs the right `docker compose` invocation for the full
stack or standalone dev-site.

Run commands from your product’s `dev/` directory (e.g. `my-product/dev`), or
pass `--cwd`. The reference layout is [`saflib/base/dev`](../../base/dev) when
working inside the saflib repo itself.

## Typical `package.json` scripts

Copy from [`saflib/base/dev/package.json`](../../base/dev/package.json). Omit
`saf-dev-site sync-node-modules` from `dev`/`up` if you do not use saf-docker
named `node_modules` volumes:

```json
{
  "scripts": {
    "build": "saf-docker build --compose docker-compose.yaml",
    "dev": "saf-docker build --compose docker-compose.yaml && saf-dev-site sync-node-modules && saf-dev-site compose up -V",
    "up": "saf-docker build --compose docker-compose.yaml && saf-dev-site sync-node-modules && saf-dev-site compose up --detach -V",
    "prune": "saf-docker prune",
    "down": "saf-docker generate && saf-dev-site compose --no-prepare down",
    "dev-site": "saf-docker build @saflib/dev-site-docker && saf-dev-site compose --dev-site up -V",
    "dev-site:down": "saf-dev-site compose --dev-site --no-prepare down"
  },
  "devDependencies": {
    "@saflib/dev-site-cli": "*",
    "@saflib/dev-site-docker": "*",
    "@saflib/docker": "*"
  }
}
```

Do **not** hand-roll `dev-site.env` or wrap `docker compose` in shell scripts;
`saf-dev-site compose` runs `prepare` first (unless `--no-prepare`), picks
`docker-compose.yaml` vs `docker-compose.dev-site.yaml`, applies submodule
git-dir overlays when `saflib` is a submodule (and the worktree overlay in a git
worktree), creates an empty `.env` if there is none, and passes `env.dev` /
`.env` / `dev-site.env` as needed.

## Commands

| Command | Purpose |
| --- | --- |
| `saf-dev-site prepare` | Write `dev-site.env`, `.claude-credentials.json`, Cursor agent creds; create an empty `.env` if missing |
| `saf-dev-site compose …` | `docker compose` for stack (`--dev-site` for standalone UI) |
| `saf-dev-site sync-node-modules` | Refresh named `node_modules` volumes via `saf-docker` |
| `saf-dev-site volume import <volume> <dir>` | Copy a host folder into a named volume (refuses a non-empty volume without `--force`) |
| `saf-dev-site volume export <volume> <dir>` | Copy a named volume into a host folder, e.g. to open a database with `sqlite3` or keep a backup |

Agent credentials and layout detection are documented in
[`saflib/base/docs/02-claude-agent-in-docker.md`](../../base/docs/02-claude-agent-in-docker.md).

## Dev data and git worktrees

Dev data (SQLite databases, Kratos, uploaded files) lives in named Docker volumes
with fixed names (see [`saflib/base/dev/docker-compose.yaml`](../../base/dev/docker-compose.yaml)),
not in folders under the checkout. So:

- **Every checkout shares one set of dev data.** Running `npm run dev` from a git
  worktree uses the same databases as the main clone, with that worktree's code.
- **One stack at a time.** The compose project `name` is fixed, so starting the stack
  from another checkout replaces the running one. That keeps a single writer per
  database.
- **SQLite stays off the host file share.** On macOS, Docker Desktop's file sharing
  handles SQLite's WAL `-shm` mmap badly, so databases there risk corruption.
- **Inspecting data:** stop the stack, then `saf-dev-site volume export <volume> <dir>`
  and open the copy. Keep tracked fixtures (e.g. recorded API responses) as bind
  mounts, since they belong to each checkout.
- **Branch migrations:** a branch that adds database migrations applies them to the
  shared databases, and switching back does not undo them. Export the volumes first if
  you will want the old state back, and import them (`--force`) to restore.

In a worktree, the checkout's `.git` is a file pointing into the main repository's
`.git` by absolute path. `saf-dev-site` detects this and adds
`docker-compose.worktree.yaml`, which mounts that directory at the same path in the
site container so git works there.

