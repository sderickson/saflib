# Running the Claude Code agent inside the dev-site container

Workflow `update` steps (see [@saflib/new-workflows](../../new-workflows/plans/spec.md))
can be driven directly by an agent instead of printing prompts for a human to
relay — `kickoff --run=claude` on the CLI, or the equivalent `agentConfig` on
a run started through dev-site. For that to work from dev-site itself (a
browser hitting the dev-site container in `base/dev`), the container needs a
working `claude` CLI, not just the host machine.

## Mechanism

- **`claude` is installed in the dev-site-docker image**
  (`dev-site/dev-site-docker/Dockerfile.template`, `npm install -g
  @anthropic-ai/claude-code`).

- **The container runs as the image's non-root `node` user, not root.**
  `--dangerously-skip-permissions` (which the `claude-agent` adapter always
  passes, so a headless run never blocks on a permission prompt) refuses to
  run as root outright. Running as non-root generally is also just better
  hygiene for a container that executes an agent with permissions skipped —
  it's what contains the blast radius, not the OAuth reuse below.

- **The host's OAuth session is reused, not a separate API key.** A Claude
  Pro/Max login lives in the macOS Keychain (or a plain
  `~/.claude/.credentials.json` file on Linux, since there's no keychain in
  a container). `scripts/resolve-claude-credentials.sh` (in this folder)
  extracts whichever one the host has into a gitignored
  `.claude-credentials.json` next to the compose files, which is
  bind-mounted read-write into the container at
  `/home/node/.claude/.credentials.json`. It runs on every `npm run dev`
  (wired into `dev-compose.sh`/`dev-site-compose.sh`), never prints the
  credential value, and soft-fails to an empty placeholder if the host
  isn't logged in — `docker compose up` still comes up either way, just
  without a working agent.

- **The repo mount is read-write.** `/repo` used to be mounted `:ro` (the
  dev-site scan/commit features only ever read it); it's now read-write so
  an agent's file edits land on the same checkout the host sees. The mount
  still covers exactly one thing — `DEV_SITE_REPO_MOUNT`, the product +
  saflib monorepo checkout — nothing else on the host is exposed.

## Why this is reasonably safe

- **Scope is unchanged, just no longer read-only.** The agent's reach inside
  the container is `/repo` (product + saflib, same as the read-only mount
  already exposed), `/data` (dev-site's own sqlite), and the container's own
  disposable image filesystem. No SSH keys, no other repos or projects, no
  Docker socket, no other host paths are mounted in.
- **Non-root contains the container-local blast radius.** Even with
  permissions skipped, the agent can't touch root-owned files inside the
  container itself.
- **The container holds a copy of the session, not the Keychain.** If you
  ever suspect it's been misused, `claude logout` (or just re-login) on the
  host rotates the underlying token; the container's stale copy stops
  working, and the next `npm run dev` pushes a fresh one. The copy itself
  is gitignored and never leaves the machine.
- **This is the same risk profile as running `--dangerously-skip-permissions`
  locally** — a supported, common pattern for sandboxed dev environments —
  not a new category of exposure. If anything, containerizing it narrows
  what the agent can reach compared to running the same flag directly on
  the host.

**Known tradeoff, not a security issue:** OAuth refresh tokens typically
rotate on use. If the host CLI and the container's CLI both refresh around
the same time, one can invalidate the other's session — a usability hiccup
(re-run `npm run dev`, or re-login on host), not a vulnerability.

See [`base/security/threat-model.md`](../security/threat-model.md)'s
**Operator hygiene** section for the broader guidance this extends: coding
agents running on a machine raise the stakes of everything else on that
machine (SSH keys, other credentials) being reachable — the containerization
here is what keeps this specific agent's reach bounded to the repo it's
meant to edit.
