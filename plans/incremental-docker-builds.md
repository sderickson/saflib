# Incremental Docker builds: skip images whose inputs haven't changed

> **Living document.** Whoever works on this (human or agent) keeps the
> **Status** section and **Decisions log** current as work lands. If you pick
> this up cold, read Status first, then Design, then the next unchecked phase.

## Status

- **Phase:** design approved. No code written yet.
- **Last updated:** 2026-10-05
- **Next action:** start Phase 1. Phase 2 ends with a **go/no-go gate**:
  report the measured skip rates to the owner and stop for a decision before
  starting Phase 3.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | `@saflib/git` tree-hash helpers | not started |
| 2 | `saf-docker inputs` + skip-rate measurement | not started |
| 3 | Build metadata (`/etc/saf/builds/`) + OCI labels | not started |
| 4 | `builds/` convention + generator emits inputs manifest | not started |
| 5 | `saf-docker build` orchestrator | not started |
| 6 | Migrate dev + deploy scripts; retire `saf-git-hashes` | not started |

## Context

Building Docker images is slow even when every layer is cached. Each build
still sends the context, checks every layer, exports the image, and (in deploy)
pushes it, for every image, every time. Most of the time most images' inputs
haven't changed.

Goal: build images per **build ref**, tie each image to the exact content it
was built from, and only rebuild when something the image depends on has
changed. Benefits dev (`base/dev/build-images.sh`), CI, and deploy
(`deploy/local-scripts/build.sh` + `push.sh`).

Separately (not this plan): reduce dev restarts with watch mode
(`tsx watch`/nodemon). Complementary, not a substitute.

### How things work today (as of 3ffecb23)

- `@saflib/monorepo` (`monorepo/src/workspace.ts`) builds the workspace
  dependency graph and finds `packagesWithDockerfileTemplates`, meaning packages
  with a `Dockerfile.template` at their root. One image per package.
- `@saflib/docker` `generateDockerfiles()` (`docker/src/docker.ts`) fills in
  templates:
  - `#{ copy_packages }#` → `COPY .saf-docker/stage/<image>/ ./` (staged,
    dev-dep-stripped `package.json`s + lockfile for `npm ci --omit=dev`).
  - `#{ copy_src }#` → `COPY --parents <transitive workspace dep dirs> ./`
    plus a `RUN` that installs git and runs `saf-git-hashes` if `.git` is
    present.
  - `#{ git_hashes }#`, `#{ package_root }#`.
  - Always adds `@saflib/docker` (+ deps) to every image so the
    `saf-git-hashes` CLI is present.
- Generated `Dockerfile`s and `.saf-docker/` are gitignored.
- `saf-git-hashes` (`docker/src/git-hashes.ts`) writes
  `{ root, saflib }` (product repo HEAD and saflib HEAD, each with a `-dirty`
  suffix if needed) to `saflib/node/git-hashes.json` and
  `saflib/vue/src/git-hashes.json`. Consumers:
  - `node/src/git-hashes.ts` `getGitHashes()` → used by
    `audit/audit-db/queries/audit-event/append.ts`.
  - `vue/src/git-hash.ts` (bundled into client JS via `import.meta.glob`).
  - `vendors/sentry-node/vite-build.ts` (Sentry release name).
- Build order is hand-written in bash with parallel `&`/`wait` and
  workflow-managed `BEGIN WORKFLOW AREA` blocks:
  - `base/dev/build-images.sh`: static-root, static sites, monolith, clients,
    and dev-site in parallel, then the caddy image
    (`FROM saflib-base-static-root:latest`).
  - `deploy/local-scripts/build.sh` (supports `native`/`amd64`), then
    `push.sh` pushes `:latest` tags.
- Products consume saflib as a nested directory (often a git submodule), which
  is why there are two hashes (`root`, `saflib`).

## Design

### Core idea: content-addressed input hash, not commit history

The question "has anything this image depends on changed since it was built?"
is answered by comparing **content**, not walking history. Git already
content-hashes every directory:

```
git rev-parse HEAD:base/service/monolith   # tree hash of that dir at HEAD
```

For each build ref we compute an **input hash** = sha256 over a sorted,
canonical list of `(input-path, content-hash)` pairs plus a few scalar inputs
(see below). The image is tagged `<image>:in-<first 16 hex of input hash>`.
**Needs rebuild = that tag does not exist** (locally:
`docker image inspect`; registry: `docker buildx imagetools inspect`).

Why this instead of `git diff <built-from-commit> HEAD -- <paths>`:

- Works with shallow CI clones (GitHub Actions defaults to depth 1). Only HEAD
  is needed.
- Holds up after rebase/squash/cherry-pick, which rewrite commits. Reverts hit
  the cache automatically.
- No need to first find out which commit the previous image was built from
  (which would mean pulling the image or reading registry metadata). The hash
  is computed locally and the registry only answers yes/no.
- Deterministic and easy to test.

The commit hash is still recorded in the image as **metadata** (see "Build
metadata"). It is never part of the input hash.

### Inputs to the hash

For build ref `R` of package `P`:

1. **Source trees.** Tree hash of each directory in
   `{P} ∪ getAllPackageWorkspaceDependencies(P)`. This is the same set
   `copy_src` copies today. Include `@saflib/docker` only if the image still
   needs it after Phase 6 (it probably won't).
2. **Staged install inputs.** Content hash of `.saf-docker/stage/<image>/`
   (staged root `package.json`, per-image lockfile, postinstall scripts). Hash
   this, **not** the root `package-lock.json`, so an unrelated dependency bump
   doesn't rebuild everything. Note: the staged lockfile is currently the
   *whole* lockfile with `devDependencies` stripped. Pruning it to only this
   image's dependency closure would improve skip rates further. Track as a
   follow-up and measure first.
3. **The generated Dockerfile.** Gitignored, so hash the file on disk. This
   covers template changes and generator changes that affect output.
4. **Extra `COPY` sources** outside the dependency set, e.g. monolith copies
   `deploy/__product-name__/env.defaults` and `deploy/scripts/apply-env-defaults.sh`;
   `clients/root` copies SCSS/public from `clients/build`. The generator parses
   `COPY` source paths from the final Dockerfile (excluding `--from=` copies and
   the staged dir) and adds them as inputs. A test asserts every `COPY` source
   is covered by some input.
5. **Upstream images.** For `FROM <saf-image>` / `COPY --from=<saf-image>`
   referencing another build ref, include that ref's **input hash** (Merkle
   style). The DAG of refs is derived from these references.
6. **Scalars:** target platform (`linux/amd64` vs native arch), a
   `HASH_SCHEMA_VERSION` constant (bump to invalidate everything), and external
   base images as written in the Dockerfile (`node:24-slim`, `caddy:2.11.3`).
   Floating tags won't trigger rebuilds on upstream pushes. That's acceptable;
   use `--force` or pin by digest if it matters.

#### Uncommitted changes

A tree hash of HEAD ignores working-tree edits, which breaks local dev. Instead,
compute tree hashes from a **scratch index** seeded from HEAD, with the working
tree's tracked and untracked-not-ignored files under the input paths staged into
it (`GIT_INDEX_FILE=<tmp> git add -A -- <paths>` → `git write-tree` →
`git rev-parse <tree>:<path>`). `@saflib/git/scratch-tree.ts` already has the
scratch-index pattern. The real index and working tree are never touched. If
the result differs from HEAD's trees, metadata records `dirty: true`.

#### Gitignored-but-copied files

Tree hashes only see git-tracked content. Anything gitignored but *not*
dockerignored that lands in the build context would be invisible to the hash.
Today `.gitignore` and `.dockerignore` mostly agree (`dist`, `node_modules`,
`.vitepress/*`), but `**/*.d.ts` is gitignored and not dockerignored. Phase 2
must audit this: for each image, list files that would be in the context under
input paths and are gitignored, and either dockerignore them or confirm they
don't affect the image. Add a check so this stays true.

#### Nested repos (saflib as submodule)

When saflib is a submodule of a product repo, paths under `saflib/` must be
hashed against the saflib repo (`git -C saflib ...`), not the parent. The
helper resolves each input path to its containing repo (walk up to the nearest
`.git` file/dir, reusing `findProductRoot` logic) and hashes relative to that.

### Build metadata baked into images

Each build writes `/etc/saf/builds/<build-id>.json` as its **final layer**
(after everything else, so it never invalidates earlier layers and never feeds
the input hash):

```json
{
  "schema": 1,
  "buildRef": "@saflib/base-monolith/builds/prod",
  "image": "saflib-base-monolith-prod",
  "inputHash": "3f9a…",
  "commits": { "root": "<sha>", "saflib": "<sha>" },
  "dirty": false,
  "platform": "linux/amd64",
  "builtAt": "2026-10-05T12:00:00Z",
  "upstream": ["@saflib/base-clients/builds/static-root"]
}
```

- `<build-id>` = image name (filesystem-safe).
- Files from upstream images carry through via `FROM`. For multi-stage
  `COPY --from=<builder>`, the generator also copies
  `/etc/saf/builds/` from that stage, so the final image holds the full set
  (the "amalgamation").
- Values are passed as `--build-arg`s (`SAF_BUILD_INFO` JSON) consumed by a
  generated `RUN`/heredoc step at the end. Build args used only in the last
  layer don't bust earlier cache.
- The same values go into OCI labels (`org.opencontainers.image.revision`,
  `org.opencontainers.image.source`, `dev.saflib.input-hash`,
  `dev.saflib.build-ref`) so they can be read without running the image.
- `@saflib/node` gets a reader (`getBuildInfo()` → all files in
  `/etc/saf/builds/`, plus a "self" pick). `getGitHashes()` is reimplemented on
  top of it during migration.

**Reported version (decided):** a running image reports the commits it was
**built from**, which may be older than the deployed commit. That's accepted.
What gets reported stays the same as today: exactly two hashes, `root` (product
repo) and `saflib` (platform repo), taken from the image's own ("self") build
info. `GitHashes`, audit events and Sentry releases keep their current
`{ root, saflib }` shape. The other per-build files in `/etc/saf/builds/` are
diagnostics only and aren't reported. If images are later split into finer
layers than product/platform, revisit how versions are tracked and reported at
that point. Don't design for it now.

**Client bundles:** `vue/src/git-hash.ts` bakes hashes into JS. That's fine as
long as the value comes from the build arg *at build time of that image* and is
not an input. Since the image only rebuilds when its inputs change, the bundled
hash stays consistent with the image metadata. The current approach of writing
`git-hashes.json` into the source tree before the build must go, because it
would make the file an input that changes every commit.

### Build refs and the `builds/` convention

- A package can have any number of builds at
  `<package>/builds/<name>/Dockerfile.template`. The generated `Dockerfile` sits
  next to it (gitignored, as now).
- **Build ref:** `<npm-package-name>/builds/<name>`, e.g.
  `@saflib/base-monolith/builds/prod`. (No trailing `/Dockerfile`; the
  directory identifies the build.) Nested names are allowed
  (`builds/prod/arm`), and the ref is the path relative to the package root.
- **Image name:** `imageNameFromPackageName(pkg)` + `-` + name with `/` → `-`,
  with leading `_` and other invalid characters sanitized (the
  `__static-subdomain-name__` tag problem already exists in `build-images.sh`).
  `<image>:latest` is still tagged for compose compatibility.
- **Inputs are package-scoped:** all builds in a package share the package's
  dependency closure. Multiple builds per package are for variants that differ
  by Dockerfile (dev/prod, targets), not by dependencies. Packages that exist
  for dependency isolation (`clients/root`, `clients/build`, static sites) stay
  separate packages.
- **Back-compat:** a root-level `Dockerfile.template` is treated as build
  `default` (ref `<pkg>/builds/default`, image name unchanged) until migrated.
  `findPackagesWithDockerfileTemplates` becomes `findBuilds()` returning
  `{ packageName, buildName, templatePath }[]`.
- Optional per-build config `builds/<name>/build.json` (only if needed):
  `{ "extraInputs": [...], "platforms": [...] }`. Don't add until a real case
  needs it.

### CLI surface (`saf-docker`)

- `saf-docker generate` (exists) → also writes
  `.saf-docker/manifests/<image>.json`: inputs list, upstream refs, image name.
- `saf-docker inputs <ref> [--json] [--platform]` → prints the inputs, their
  hashes, and the final input hash. Pure and local. This is the debugging tool.
- `saf-docker status [refs…]` → per ref: input hash, exists locally? in
  registry? → `up-to-date | build | pull`.
- `saf-docker build [refs…|--all] [--platform] [--push] [--registry] [--force]
  [--concurrency N]`:
  1. generate Dockerfiles + manifests
  2. topologically sort the ref DAG
  3. for each ref, compute the input hash (upstream hashes first); if
     `:in-<hash>` exists locally, skip; else if `--registry` and it exists
     remotely, pull (or with `--push` just retag remotely via
     `imagetools create`); else build
  4. build with `--build-arg SAF_BUILD_INFO=…`, tag `:in-<hash>` and `:latest`
  5. `--push` pushes only tags that were newly built or retagged
  6. print a summary table (built / skipped / pulled, timings)
- Exit code nonzero if any build fails; independent branches continue.

### Implementation phases

#### Phase 1: `@saflib/git` tree-hash helpers

- `treeHash(repoRoot, rev, path)` → `git rev-parse <rev>:<path>`. Returns an
  error if the path doesn't exist at that rev.
- `workingTreeHashes(repoRoot, paths)` → `{ path → treeHash, dirty }` via a
  scratch index seeded from HEAD + `git add -A -- <paths>` +
  `write-tree`. Reuse/extend `scratch-tree.ts` (add an `addPaths` helper).
- `repoRootFor(path)` → nearest enclosing repo (handles submodule `.git`
  files).
- Follow existing conventions: `ReturnsError`, `execGit`, export from
  `git/index.ts`.
- Tests: scratch-repo integration tests covering clean, modified, untracked,
  ignored (excluded), deleted file, and submodule.

#### Phase 2: `saf-docker inputs` + measure

- `docker/src/inputs.ts`: given a `MonorepoContext` + build, compute the input
  list (items 1–6 above) and the hash. Upstream detection: parse `FROM`/`COPY
  --from` image names and map them to known builds by image name.
- Bin command `saf-docker inputs`.
- Gitignored-in-context audit (see above). Fix `.dockerignore` as needed.
- **Measurement (go/no-go gate, decided):** script that walks the last
  ~100 commits on main (`git worktree` or tree-only computation per commit;
  tree hashes at a commit don't need a checkout, but staged lockfile and
  generated Dockerfile do. Approximate those with the root lockfile hash and
  template hash for measurement) and reports per image how often the hash
  changed. Record results in this doc, then **stop and get an explicit go/no-go
  from the owner** before Phase 3. Phase 1–2 code (tree-hash helpers,
  `saf-docker inputs`) is useful as a diagnostic on its own either way. If the
  staged lockfile turns out to dominate the churn, flag it in the report.
  Lockfile pruning is decided at that point, not before.

#### Phase 3: build metadata

- Generator appends a final metadata step (`ARG SAF_BUILD_INFO` + write
  `/etc/saf/builds/<id>.json`) and `LABEL`s. Multi-stage: copy
  `/etc/saf/builds/` from `--from` stages.
- `@saflib/node` `getBuildInfo()`; reimplement `getGitHashes()` on top of it
  (fall back to the old JSON file, then `"unknown"`).
- Vue: replace the `git-hashes.json` glob with a Vite `define` fed from the
  build arg / env at build time.
- Sentry: `vendors/sentry-node/vite-build.ts` release from build info.

#### Phase 4: `builds/` convention

- `monorepo`: `findBuilds()`; keep `packagesWithDockerfileTemplates` derived
  for back-compat until callers migrate.
- `docker`: `generateDockerfiles` iterates builds, writes each `Dockerfile`
  next to its template, and writes manifests.
- Migrate saflib's own templates (`base/dev`, `base/service/monolith`,
  `base/clients/*`, `cron/*`, `dev-site/dev-site-docker`, `backup/backup-sdk`)
  and the workflow templates that generate them (`service/workflows`,
  `vue/workflows`, `product/workflows`, `sdk/workflows`,
  `identity/identity/workflows`). Workflow template paths must move in
  lockstep, so check each workflow's copy/update steps.

#### Phase 5: `saf-docker build`

- DAG + topological parallel scheduler (bounded concurrency).
- Existence checks (local / registry), pull/retag, build, tag, push.
- `--platform` handling mirroring `build.sh` (`native` | `amd64`).
- Tests: scheduler and skip logic with a mocked docker executor (follow the
  `__mocks__` pattern already in `docker/`).

#### Phase 6: migrate scripts, retire old path

- `base/dev/build-images.sh` → `saf-docker build --all` (or the dev subset).
  Remove its `BEGIN WORKFLOW AREA build-static-sites` block and update the
  `vue/add-static-site` workflow so it no longer edits that file (the new build
  dir gets discovered automatically).
- `deploy/local-scripts/build.sh` + `push.sh` →
  `saf-docker build --platform amd64 --push --registry $CONTAINER_REGISTRY`.
  Same workflow-area cleanup for `product/init`.
- Compose files keep referencing `:latest` for now. Optionally pin deploy
  compose to `:in-<hash>` tags later.
- Remove `saf-git-hashes`, the `withDockerForGitHashes` injection, and the
  in-image `apt-get install git` step. Images get smaller and the `@saflib/docker`
  source is no longer copied into every image.
- Update `docker/docs/01-overview.md`.

### Explicitly out of scope

- Adopting Bazel/Nx/Turborepo. The repo already has its own dependency graph;
  this is a few hundred lines in `@saflib/docker`.
- Dev hot-reload / watch mode (separate effort).
- Pruning per-image lockfiles to the dependency closure (follow-up, after
  Phase 2 measurement).
- Garbage-collecting old `:in-*` tags locally/in the registry (follow-up; note
  that local disk will grow).

### Verification

- `cd git && npm test && npm run typecheck`
- `cd docker && npm test && npm run typecheck`
- `cd monorepo && npm test && npm run typecheck`
- `cd node && npm test && npm run typecheck`
- Manual, dev: run `saf-docker build --all` twice. The second run builds
  nothing. Edit a file in `base/service/monolith`, and only monolith and its
  downstream images rebuild. Edit a file only the clients use, and monolith is
  skipped.
- Manual, deploy: `saf-docker status --registry …` after a no-op commit shows
  everything up to date. A container's `/etc/saf/builds/*.json` and
  `docker inspect` labels show the expected commit and input hash.

## Open questions

None open. The owner resolved the initial set on 2026-10-05 (see Decisions
log). Add new questions here as they come up.

## Decisions log

- 2026-10-05: Use content-addressed input hashes (git tree hashes + staged
  file hashes) instead of commit-history diffing. Reasons: shallow clones,
  rebases/squashes, no need to look up the previous build's commit. Commit
  hashes remain as metadata only.
- 2026-10-05: Build metadata lives in `/etc/saf/builds/<build-id>.json`
  (one file per build that contributed to the image) plus OCI labels, written
  as the final layer from a build arg.
- 2026-10-05 (owner review):
  - **Reported version = built-from commits.** Keep reporting only
    `{ root, saflib }` (product + platform repos), taken from the image's own
    build. If builds get split into finer layers later, revisit tracking and
    reporting then.
  - **Build ref format:** `<npm-package-name>/builds/<name>` (no trailing
    `/Dockerfile`).
  - **Registry existence checks** from CI/deploy are approved. Reuse the
    existing push auth.
  - **Phase 2 is a go/no-go gate.** Report the skip-rate measurements and get
    an explicit decision before Phase 3.
  - **Lockfile pruning** stays out of scope. Revisit only if Phase 2
    measurement shows lockfile churn dominates.
