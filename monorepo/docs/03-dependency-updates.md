# Dependency updates

How dependency updates flow from the registry to saflib to each product, who (or what) does each step, and what to do when a step goes red. [Version management](./02-version-management.md) explains the mechanics this relies on: one lockfile per product, overrides only at the install root, and the alignment check.

The goal: update PRs open on their own, go green, and merge with at most a glance, in saflib and in every product.

## The flow

```
registry ──Renovate──▶ saflib (auto-merges when CI is green)
                          │
                          ▼  an agent bumps the submodule (health check says when)
                       product ◀──Renovate── product-only packages
```

1. **saflib is the source of truth** for every package it declares. Renovate opens PRs against saflib, and they merge themselves once CI is green, majors included. saflib deploys nowhere, and its CI (unit tests, a fresh-product smoke test, workflow runs) is what decides whether an update is safe.
2. **Products follow saflib.** An agent bumps the `saflib/` submodule, copies saflib's root `overrides`, re-resolves the lockfile, and opens a PR. The ops health check drives when: `/ops/dependencies` shows advisories and outdated packages, and the fix for a package saflib provides is to adopt the saflib commit that has it.
3. **Product-only packages** (ones no saflib package declares) get Renovate PRs in the product repo. Products extend saflib's preset, which turns off every package saflib owns (see [Products: Renovate](#products-renovate)).
4. **People merge product PRs.** Agents open and fix them; they don't merge, and they don't deploy.

## saflib: Renovate auto-merge

`saflib/renovate.json`:

| Setting                                                         | Why                                                                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `automerge: true`, `automergeType: "pr"`                        | Every update merges once green.                                                                                                                                         |
| `platformAutomerge: false`                                      | Renovate merges the PR itself on its next run, instead of GitHub's native auto-merge, which private repos on the free plan can't use (it needs branch protection).      |
| `rebaseWhen: "behind-base-branch"`                              | When one PR merges, the others rebase and rerun CI, so none merges on a stale green or sits red because a sibling changed the lockfile.                                 |
| `minimumReleaseAge: "3 days"`, `internalChecksFilter: "strict"` | No release younger than three days is proposed; bad publishes usually get yanked by then. Security fixes skip the wait (`vulnerabilityAlerts.minimumReleaseAge: null`). |
| `osvVulnerabilityAlerts`, `vulnerabilityAlerts`                 | Advisory-driven PRs, labelled `security`.                                                                                                                               |
| `lockFileMaintenance` (Mondays before 9am)                      | Weekly full re-resolve, which catches transitive updates no direct bump triggers.                                                                                       |
| `prConcurrentLimit: 6`, `prHourlyLimit: 2`                      | Keeps the rebase churn bounded.                                                                                                                                         |
| groups                                                          | Vue, Vite/Vitest, type definitions, GitHub Actions, Docker images, and a non-major catch-all, so coupled packages move together.                                        |

`@saflib/**` and `template-package-**` are disabled: those are workspace packages, not registry ones.

Validate changes with:

```bash
npx --yes --package renovate@41 -- renovate-config-validator
```

### When a saflib Renovate PR stays red

It doesn't merge; someone (usually an agent) fixes it on the PR branch. In rough order of likelihood:

- **The fresh-product smoke test or alignment check fails**: an update changed how npm nests things. See [Debugging an alignment failure](#debugging-an-alignment-failure).
- **A pinned override fights the update**: `saflib/package.json` `overrides` pins Vue, Vite, rolldown and others exactly. A group that bumps a pinned package needs the override bumped too (and every package that pins it, such as `vite/package.json`).
- **Unit or type breaks from a major**: fix the code, as with any change.
- **Every workflow fails at startup with "workflow file issue" and zero jobs**: check [githubstatus.com](https://www.githubstatus.com) before debugging; an Actions outage looks exactly like this. Rerun once it clears.

## Products: Renovate

A product's `renovate.json` extends saflib's preset:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    "github>sderickson/saflib//renovate/product"
  ]
}
```

`renovate/product.json` (generated by `npx saf-monorepo renovate-preset` from saflib's `package.json` files; a unit test fails when it's stale) sets the product defaults (timezone, 3-day release age, OSV alerts, rebase when behind, grouped Actions and Docker images) and turns off:

- every registry package any saflib package declares, plus saflib's root overrides: those versions reach the product through a saflib bump, and a product PR for them can't go green against saflib's overrides;
- `@saflib/*`;
- Node (Docker `node` and `node-version`): products move after saflib does.

What's left are the product's own packages, its GitHub Actions, its Docker images and runner pins. Renovate closes open PRs for packages the preset turns off.

To let Renovate merge low-risk updates itself once CI is green (Actions and image digests and patches, npm patches of product-only packages), also extend `github>sderickson/saflib//renovate/product-automerge`. Majors and minors still wait for a person.

## Products: bumping saflib

Run from the product root, on a branch:

```bash
npx saf-monorepo saflib-bump
```

It fetches saflib, moves the submodule to `origin/main` (never backwards: a stale, unfetched `main` would otherwise drag the product to old code and leave a lockfile `npm ci` rejects), copies saflib's root overrides, re-resolves `package-lock.json` and runs `lock-prune --fix`. Then install, typecheck, test and commit. The steps it automates:

1. **Copy saflib's root `overrides`** into the product root `package.json`. npm only honours overrides at the install root, so the product's copy is the one that applies. `lock-prune` reports any differences ("product root overrides differ from saflib's").
2. **Re-resolve the lockfile**:
   ```bash
   npm install --package-lock-only --ignore-scripts
   ```
   This keeps any existing resolution that still satisfies the ranges, so on its own it won't pick up saflib's newer versions or remove stale nested copies. Step 3 does that.
3. **Run lock-prune until it's clean**:
   ```bash
   npx saf-monorepo lock-prune         # report
   npx saf-monorepo lock-prune --fix   # repair, re-resolve, repeat
   ```
   `--fix` loops: it removes stale and nested lockfile entries, re-resolves with npm, and checks again, up to five passes. Re-resolving often leaves the next problem; for example, npm re-nests a package under a saflib workspace, and the next pass hoists it. Whatever's left is either:
   - a **genuine range conflict** ("Still misaligned after re-resolving"): a workspace package's range can't share the root's version. Align the ranges, or add an override that matches saflib's; or
   - a **product decision** (competing dependency, override drift, version skew): the product declares something different from saflib. Usually adopt saflib's version; keep the product's only for a reason worth writing down.
4. **Install, typecheck, test**: `npm install`, `npm run typecheck`, the product's unit tests, and a dev-stack start (its `deps` service runs the alignment check before installing).
5. **Open the PR.** It should go green on its own; if CI disagrees with your machine, see below.

`lock-prune` includes the alignment check, so a clean `lock-prune` means the dev stack, product CI, and the Docker builds see an aligned lockfile. Products can also run the check directly: `node --experimental-strip-types saflib/docker/dev/check-dependency-alignment.ts`.

### Don't run npm inside `saflib/`

npm walks up to the outermost workspace, so `npm install` in `saflib/` rewrites the **product's** lockfile, not saflib's. To change saflib's own lockfile, use a separate worktree outside the product:

```bash
git -C saflib worktree add ~/src/saflib-lock <branch>
cd ~/src/saflib-lock && npm install --package-lock-only --ignore-scripts
# commit there; remove the worktree when done
```

### The submodule's detached HEAD

`git submodule update` leaves `saflib/` on a detached HEAD. If you're making saflib changes alongside a product bump, check out the saflib branch again before committing in it, or the commits won't be on any branch.

## Debugging an alignment failure

The alignment check prints which packages want which versions:

```
@vitejs/plugin-vue: 6.0.5 installed under saflib/vue/node_modules, 6.0.10 at the root
  6.0.5: (no direct requester)
  root: vitepress wants ^6.0.8; saflib/vite wants ^6.0.1
```

"(no direct requester)" means nothing asks for the nested version any more; it's a stale resolution, and `lock-prune --fix` removes it. A named requester whose range excludes the root's version is a real conflict.

When saflib's fresh-product smoke test fails but your product passes, reproduce with a fresh product, not your working copy: leftover `node_modules` and old lockfile resolutions hide the problem. Bootstrap a product from your local saflib in a scratch directory (`runBootstrap` from `saflib/product/create/bootstrap.ts`, with the submodule step replaced by copying your saflib tree, excluding `node_modules`), then run the alignment check against it. Bisect overrides one at a time from there.

## Advisories with no fix

Some advisories can't be fixed by an update: the vulnerable package is a transitive dependency and nothing upstream has moved. Options, in order:

1. An `overrides` entry forcing a fixed version, if the dependent package tolerates it (test it).
2. Accept it for now, with the reason written down where the next agent will find it (the PR that decided it, and the daily check's notes). For example, zod 3 via `@infisical/sdk` has a high advisory and no fixed release `@infisical/sdk` accepts; it's accepted until upstream moves.

`/ops/dependencies` keeps reporting accepted advisories, so the digest's `actionable` count stays honest. There's no machine-readable accepted list yet; until there is, the daily check should recognize known ones from its notes rather than re-raise them.

## Pins that aren't npm packages

Renovate also manages:

- **GitHub Actions**, pinned to a commit SHA with the version in a comment (`uses: actions/checkout@<sha>  # v7`), grouped into one PR.
- **Docker images** in Dockerfiles and compose files (Node base images, Prometheus, node-exporter, Alertmanager, prom-label-proxy), grouped into one PR.
- **Runner images**: pin `runs-on: ubuntu-24.04` rather than `ubuntu-latest`, and Renovate proposes the next one as a PR. `ubuntu-latest` moves without notice, and tools that check the OS (Playwright's `install --with-deps`) start failing on a day nobody changed anything.

The ops dependency report covers what's installed in the running app (npm packages from the deployed lockfile). Images and runners are visible in the repo and in Renovate's dependency dashboard issue.

## Daily check

The daily ops agent reads `/ops/dependencies` and:

- for an advisory in a package saflib provides: checks whether saflib's `main` already has the fix. If so, a product bump is due (the steps above); if not, it's saflib's Renovate PR (or a fix in saflib) first;
- for an advisory in a product-only package: points at the product's Renovate PR, or opens a fix when Renovate can't (no fixed version in range, a major);
- flags `renovate_due` packages with no open PR (Renovate may be stuck: check its dashboard issue);
- flags when `main` has a fix that production doesn't yet (a deploy is due; deploys are a person's call).

## Why it's set up this way

The November 2026 catch-up, a few months of drift fixed in one go, surfaced each of these:

- **Renovate PRs piled up unmerged**, then conflicted with each other as each merge changed the lockfile. Hence auto-merge, plus `rebaseWhen: "behind-base-branch"`.
- **Product overrides drifted from saflib's** after bootstrap copied them once. Hence copying overrides as part of every bump, and `lock-prune` reporting drift.
- **`npm install --package-lock-only` kept stale resolutions**, so lockfiles looked updated but weren't. Hence `lock-prune --fix` deleting stale entries and re-resolving.
- **`lock-prune` passed while the alignment check failed** on the same lockfile. Hence one tool that runs both.
- **Updates that pass in a long-lived checkout broke fresh products** (Vite 8.3 changed plugin nesting; Vue 3.5.45 needed `entities` 7 where `html-sanitizer` asked for 6). Hence the fresh-product smoke test in saflib CI, and the fresh-product repro for debugging.
- **CI went red with no code change** when `ubuntu-latest` moved to a release Playwright didn't support. Hence pinned runners managed by Renovate.

## Related

- [Version management](./02-version-management.md): one install root, sources of truth, the alignment check
- [lock-prune CLI](./cli/saf-monorepo/lock-prune.md): flags
- [Ops: dependencies](../../ops/docs/01-overview.md#dependencies): the `/ops/dependencies` report
