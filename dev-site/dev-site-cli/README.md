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
git-dir overlays when `saflib` is a submodule, and passes `env.dev` / `.env` /
`dev-site.env` as needed.

## Commands

| Command | Purpose |
| --- | --- |
| `saf-dev-site prepare` | Write `dev-site.env`, `.claude-credentials.json`, Cursor agent creds |
| `saf-dev-site compose …` | `docker compose` for stack (`--dev-site` for standalone UI) |
| `saf-dev-site sync-node-modules` | Refresh named `node_modules` volumes via `saf-docker` |

Agent credentials and layout detection are documented in
[`saflib/base/docs/02-claude-agent-in-docker.md`](../../base/docs/02-claude-agent-in-docker.md).
